import "server-only";
import { DatabaseError } from "pg";
import { composerPrompt } from "@/lib/agents/chargeur-prompt";
import {
  corrigerChoix,
  corrigerReponse,
  LONGUEUR_REPONSE_MAX,
  POINTS,
  score,
  type Correction,
} from "@/lib/agents/evaluateur/correction";
import { genererQuiz } from "@/lib/agents/evaluateur/generation";
import { masquerTexteEleve } from "@/lib/agents/masquage";
import {
  controlerQuiz,
  lireQuiz,
  questionsPourEleve,
  quizEnTexte,
  type Question,
  type QuestionEleve,
  type SortieQuiz,
} from "@/lib/agents/evaluateur/quiz";
import type { ParametresModele } from "@/lib/agents/professeur/boucle";
import { avecAgentEvaluateur, avecUtilisateur, prendreQuotaEleve } from "./base";
import { alerterVeilleSansAttendre } from "./veille";
import { accesElevesOuvert, agentSuspendu, MESSAGE_AGENT_SUSPENDU } from "./disponibilite";
import { modeleDesAgents, type ContexteChapitre } from "./professeur";
import { deciderContenu } from "./validation";

// Agent Évaluateur côté serveur (ADR 0024).
// - Création de quiz : lancée par un référent de la famille pour un chapitre validé ; brouillon enregistré
//   sous le rôle agent_evaluateur (statut imposé par la base).
// - Passage du quiz : questions servies sans réponses ; questions à choix corrigées sans modèle, réponses
//   courtes par l'Évaluateur ; score écrit une seule fois ; contestations réexaminées, puis signalées.
// Aucun contenu (réponses, corrections) n'est écrit dans les journaux.

const SKILLS_EVALUATEUR = [
  "_commun/skills/contenu-non-fiable",
  "_commun/skills/eleves-mineurs",
  "evaluateur/skills/questions-de-controle",
];
export const LONGUEUR_CONSIGNE_MAX = 1000;
export const CONTESTATIONS_MAX = 2;
const UUID = /^[0-9a-f-]{36}$/;

function entier(nom: string, defaut: number): number {
  const v = Number(process.env[nom]);
  return Number.isInteger(v) && v > 0 ? v : defaut;
}

const EFFORTS = ["low", "medium", "high", "xhigh", "max"];

function parametres(
  variableEffort: string,
  effortParDefaut: ParametresModele["effort"],
  jetons: number,
): ParametresModele {
  const effort = process.env[variableEffort] ?? effortParDefaut;
  return {
    modele: process.env.MODELE_EVALUATEUR ?? "claude-opus-5-5",
    effort: (EFFORTS.includes(effort) ? effort : effortParDefaut) as ParametresModele["effort"],
    maxTokens: jetons,
  };
}
/** Création : rédaction et double vérification soignées. */
export const parametresCreation = () =>
  parametres("EFFORT_EVALUATEUR", "high", entier("MAX_JETONS_EVALUATEUR", 64000));
/** Correction d'une réponse courte ou réexamen : réponse brève, effort moyen. */
export const parametresCorrection = () => parametres("EFFORT_CORRECTION", "medium", 8000);

function promptEvaluateur(codePays: string, unite: string): string {
  return composerPrompt({
    agent: "evaluateur",
    codePays,
    unite,
    skills: SKILLS_EVALUATEUR,
    valeursDynamiques: {},
  });
}

// ---------------------------------------------------------------------------------------------------------
// Référent : création, lecture, décision.
// ---------------------------------------------------------------------------------------------------------

interface ChapitreReferent {
  id: string;
  statut: string;
  unite_id: string;
  unite: string;
  pays_code: string;
}

function chapitreDuReferent(referent: string, chapitreId: string) {
  return avecUtilisateur(referent, async (client) => {
    const { rows } = await client.query(
      `select c.id, c.statut, u.id as unite_id, u.code as unite, r.pays_code
       from chapitres c join unites u on u.id = c.unite_id join referentiels r on r.id = u.referentiel_id
       where c.id = $1 and est_referent_du_chapitre(c.id)`,
      [chapitreId],
    );
    return rows[0] as ChapitreReferent | undefined;
  });
}

export type ResultatBrouillonQuiz =
  { ok: true; version: number; questionsSignalees: number } | { ok: false; erreur: string };

export async function genererBrouillonQuiz(
  referent: string,
  demande: {
    chapitreId: string;
    nombreQuestions: number;
    difficulte: "facile" | "moyen" | "difficile" | "variee";
    consigne: string | null;
    revisionDe?: string;
  },
): Promise<ResultatBrouillonQuiz> {
  if (await agentSuspendu("evaluateur")) return { ok: false, erreur: MESSAGE_AGENT_SUSPENDU };
  if (!UUID.test(demande.chapitreId)) return { ok: false, erreur: "Chapitre inconnu." };
  if (demande.revisionDe !== undefined && !UUID.test(demande.revisionDe))
    return { ok: false, erreur: "Quiz inconnu." };
  if (
    !Number.isInteger(demande.nombreQuestions) ||
    demande.nombreQuestions < 1 ||
    demande.nombreQuestions > 10
  )
    return { ok: false, erreur: "Entre 1 et 10 questions." };
  if (!["facile", "moyen", "difficile", "variee"].includes(demande.difficulte))
    return { ok: false, erreur: "Difficulté inconnue." };
  if (demande.consigne && demande.consigne.length > LONGUEUR_CONSIGNE_MAX)
    return {
      ok: false,
      erreur: `Consigne trop longue (${LONGUEUR_CONSIGNE_MAX} caractères au plus).`,
    };
  if (demande.revisionDe && !demande.consigne)
    return { ok: false, erreur: "Indiquez les corrections attendues." };

  const chapitre = await chapitreDuReferent(referent, demande.chapitreId);
  if (!chapitre) return { ok: false, erreur: "Chapitre inconnu." };
  if (chapitre.statut !== "valide")
    return { ok: false, erreur: "Le chapitre doit d'abord être validé." };

  const limite = entier("QUIZ_PAR_CHAPITRE_PAR_JOUR", 3);
  const contexte = await avecAgentEvaluateur(
    { eleveId: null, uniteId: chapitre.unite_id },
    async (client) => {
      const programme = (
        await client.query(
          "select titre from chapitres where unite_id = $1 and statut = 'valide' order by ordre",
          [chapitre.unite_id],
        )
      ).rows.map((r) => r.titre as string);
      const { rows } = await client.query(
        "select titre, sous_themes from chapitres where id = $1",
        [chapitre.id],
      );
      const prerequis = (
        await client.query(
          `select c.titre from prerequis_chapitres p join chapitres c on c.id = p.prerequis_id
           where p.chapitre_id = $1 order by c.titre`,
          [chapitre.id],
        )
      ).rows.map((r) => r.titre as string);
      const aujourdhui = Number(
        (
          await client.query(
            "select count(*) from quiz where chapitre_id = $1 and cree_le > now() - interval '1 day'",
            [chapitre.id],
          )
        ).rows[0].count,
      );
      let precedent: string | null = null;
      if (demande.revisionDe) {
        const { rows: anciens } = await client.query(
          "select questions, notes from quiz where id = $1 and chapitre_id = $2",
          [demande.revisionDe, chapitre.id],
        );
        const ancien = anciens[0] && relireQuiz(anciens[0].questions, anciens[0].notes);
        precedent = ancien ? quizEnTexte(ancien) : null;
      }
      return { programme, chapitre: rows[0], prerequis, aujourdhui, precedent };
    },
  );
  if (!contexte.chapitre) return { ok: false, erreur: "Chapitre inconnu." };
  if (demande.revisionDe && !contexte.precedent) return { ok: false, erreur: "Quiz inconnu." };
  if (contexte.aujourdhui >= limite)
    return {
      ok: false,
      erreur: `Limite atteinte : ${limite} quiz par chapitre et par jour. Réessayez demain.`,
    };

  const reglages = parametresCreation();
  const resultat = await genererQuiz({
    systeme: promptEvaluateur(chapitre.pays_code, chapitre.unite),
    demande: {
      programmeValide: contexte.programme,
      chapitre: { titre: contexte.chapitre.titre, sousThemes: contexte.chapitre.sous_themes ?? [] },
      prerequis: contexte.prerequis,
      nombreQuestions: demande.nombreQuestions,
      difficulte: demande.difficulte,
      consigne: demande.consigne ?? undefined,
      quizPrecedent: contexte.precedent ?? undefined,
    },
    modele: modeleDesAgents("evaluateur"),
    parametres: reglages,
  });
  if (resultat.arret === "refus")
    return { ok: false, erreur: "Le modèle a refusé cette demande. Reformulez la consigne." };
  if (!resultat.sortie)
    return {
      ok: false,
      erreur:
        resultat.arret === "tronque"
          ? "Quiz trop long, génération interrompue. Demandez moins de questions."
          : "Réponse illisible du modèle. Réessayez.",
    };
  const sortie = resultat.sortie;
  if (sortie.decision === "refus")
    return {
      ok: false,
      erreur: `L'Évaluateur n'a pas créé de quiz : ${sortie.message_au_referent}`,
    };
  const problemes = controlerQuiz(sortie);
  if (problemes.length > 0)
    return {
      ok: false,
      erreur: `Quiz non conforme, non enregistré (${problemes.join(" ; ")}). Réessayez.`,
    };

  try {
    const version = await avecAgentEvaluateur(
      { eleveId: null, uniteId: chapitre.unite_id },
      async (client) => {
        const notes = {
          message_au_referent: sortie.message_au_referent,
          composante: sortie.composante,
          questions_signalees: sortie.questions_signalees,
          points_a_valider: sortie.points_a_valider,
          consigne: demande.consigne,
          revision_de: demande.revisionDe ?? null,
          modele: reglages.modele,
          genere_le: new Date().toISOString(),
        };
        const { rows } = await client.query(
          `insert into quiz (chapitre_id, questions, notes, cree_par)
           values ($1, $2, $3, 'agent_evaluateur') returning version`,
          [chapitre.id, JSON.stringify(sortie.questions), notes],
        );
        return rows[0].version as number;
      },
    );
    return { ok: true, version, questionsSignalees: sortie.questions_signalees.length };
  } catch (erreur) {
    if (erreur instanceof DatabaseError && erreur.code === "42501")
      return { ok: false, erreur: "Enregistrement refusé pour ce chapitre." };
    throw erreur;
  }
}

/** Reconstitue la sortie de l'Évaluateur à partir des colonnes du quiz (null si illisible). */
function relireQuiz(questions: unknown, notes: Record<string, unknown>): SortieQuiz | null {
  return lireQuiz(
    JSON.stringify({
      decision: "quiz",
      message_au_referent: notes.message_au_referent ?? "",
      composante: notes.composante ?? "",
      questions,
      questions_signalees: notes.questions_signalees ?? [],
      points_a_valider: notes.points_a_valider ?? [],
    }),
  );
}

export interface QuizResume {
  id: string;
  version: number;
  statut: "brouillon" | "valide" | "rejete";
  nombreQuestions: number;
  creeLe: string;
  questionsSignalees: number;
}

export function quizDuChapitre(referent: string, chapitreId: string): Promise<QuizResume[]> {
  return avecUtilisateur(referent, async (client) => {
    const { rows } = await client.query(
      `select id, version, statut, jsonb_array_length(questions) as "nombreQuestions", cree_le as "creeLe",
         coalesce(jsonb_array_length(notes -> 'questions_signalees'), 0) as "questionsSignalees"
       from quiz where chapitre_id = $1 order by version desc`,
      [chapitreId],
    );
    return rows as QuizResume[];
  });
}

export interface StatistiqueQuestion {
  question: number;
  tentatives: number;
  tauxReussite: number;
  repartition: Record<string, number>;
}

export interface QuizDetaille extends QuizResume {
  chapitreId: string;
  chapitreTitre: string;
  unite: string;
  empreinte: string;
  quiz: SortieQuiz;
  consigne: string | null;
  revisionDe: string | null;
  historique: {
    decision: "valide" | "rejete";
    commentaire: string | null;
    valideur: string | null;
    decideLe: string;
  }[];
  tentatives: number;
  statistiques: StatistiqueQuestion[];
}

export function quizPourReferent(referent: string, id: string): Promise<QuizDetaille | null> {
  return avecUtilisateur(referent, async (client) => {
    if (!UUID.test(id)) return null;
    const { rows } = await client.query(
      `select q.id, q.version, q.statut, q.questions, q.notes, q.empreinte, q.cree_le as "creeLe",
         c.id as "chapitreId", c.titre as "chapitreTitre", u.code as unite
       from quiz q join chapitres c on c.id = q.chapitre_id join unites u on u.id = c.unite_id
       where q.id = $1`,
      [id],
    );
    const ligne = rows[0];
    const quiz = ligne && relireQuiz(ligne.questions, ligne.notes);
    if (!quiz) return null;
    const historique = (
      await client.query(
        `select a.decision, a.commentaire, p.prenom_ou_pseudo as valideur, a.decide_le as "decideLe"
         from approbations a left join profils p on p.id = a.valideur_id
         where a.objet_type = 'quiz' and a.objet_id = $1 order by a.decide_le desc`,
        [id],
      )
    ).rows;
    const statistiques =
      ligne.statut === "valide"
        ? (
            await client.query(
              `select question, tentatives, taux_reussite::float as "tauxReussite", repartition
               from statistiques_quiz($1)`,
              [id],
            )
          ).rows
        : [];
    return {
      id: ligne.id,
      version: ligne.version,
      statut: ligne.statut,
      nombreQuestions: quiz.questions.length,
      creeLe: ligne.creeLe,
      questionsSignalees: quiz.questions_signalees.length,
      chapitreId: ligne.chapitreId,
      chapitreTitre: ligne.chapitreTitre,
      unite: ligne.unite,
      empreinte: ligne.empreinte,
      quiz,
      consigne: (ligne.notes.consigne as string | null) ?? null,
      revisionDe: (ligne.notes.revision_de as string | null) ?? null,
      historique,
      tentatives: statistiques.reduce((m, s) => Math.max(m, s.tentatives), 0),
      statistiques,
    } as QuizDetaille;
  });
}

export interface QuizARelire {
  /** Chapitre du pilote : en tête de la file (ADR 0071). */
  pilote: boolean;
  id: string;
  version: number;
  chapitreTitre: string;
  unite: string;
  questionsSignalees: number;
}

export function quizARelire(referent: string): Promise<QuizARelire[]> {
  return avecUtilisateur(referent, async (client) => {
    const { rows } = await client.query(
      `select q.id, q.version, c.titre as "chapitreTitre", u.code as unite,
         coalesce(jsonb_array_length(q.notes -> 'questions_signalees'), 0) as "questionsSignalees",
         est_chapitre_pilote(c.id) as pilote
       from quiz q join chapitres c on c.id = q.chapitre_id join unites u on u.id = c.unite_id
       where q.statut = 'brouillon'
       order by coalesce(jsonb_array_length(q.notes -> 'questions_signalees'), 0) > 0 desc, pilote desc,
         "questionsSignalees" desc, q.cree_le`,
    );
    return rows as QuizARelire[];
  });
}

export function deciderQuiz(
  referent: string,
  decision: {
    id: string;
    decision: "valide" | "rejete";
    version: number;
    commentaire: string | null;
  },
) {
  return deciderContenu(referent, "quiz", decision);
}

// ---------------------------------------------------------------------------------------------------------
// Élève : passage du quiz, résultat, contestation.
// ---------------------------------------------------------------------------------------------------------

export interface ReponseEnregistree {
  question: number;
  /** Indice de l'option choisie (texte, pour les statistiques) ; null pour une réponse courte. */
  choix: string | null;
  texte: string | null;
  points: number;
  correction: Correction;
}

export interface QuizEleve {
  quizId: string;
  version: number;
  questions: QuestionEleve[];
  tentative: null | {
    id: string;
    score: number;
    reponses: ReponseEnregistree[];
    /** Corrigé complet, montré seulement après la tentative. */
    questions: Question[];
    contestations: { question: number; message: string; reexamen: Correction | null }[];
  };
}

/** Dernier quiz validé du chapitre, sans les réponses tant que l'élève n'a pas fait sa tentative. */
export function quizPourEleve(contexte: ContexteChapitre): Promise<QuizEleve | null> {
  return avecAgentEvaluateur(
    { eleveId: contexte.eleveId, uniteId: contexte.uniteId },
    async (client) => {
      const { rows } = await client.query(
        `select id, version, questions from quiz
         where chapitre_id = $1 and statut = 'valide' order by version desc limit 1`,
        [contexte.chapitreId],
      );
      const quiz = rows[0];
      if (!quiz) return null;
      const questions = quiz.questions as Question[];
      const tentatives = await client.query(
        "select id, score::float as score, reponses from tentatives_quiz where quiz_id = $1 and eleve_id = $2",
        [quiz.id, contexte.eleveId],
      );
      const t = tentatives.rows[0];
      let tentative: QuizEleve["tentative"] = null;
      if (t) {
        const contestations = (
          await client.query(
            "select question, message, reexamen from contestations_quiz where tentative_id = $1 order by cree_le",
            [t.id],
          )
        ).rows.map((c) => ({
          question: c.question as number,
          message: c.message as string,
          reexamen: (c.reexamen?.resultat ? c.reexamen : null) as Correction | null,
        }));
        tentative = { id: t.id, score: t.score, reponses: t.reponses, questions, contestations };
      }
      return {
        quizId: quiz.id,
        version: quiz.version,
        questions: questionsPourEleve(questions),
        tentative,
      };
    },
  );
}

const MOTIFS: Record<Correction["signalement"], string | null> = {
  aucun: null,
  detresse: "detresse",
  erreur_possible_du_quiz: "erreur_contenu",
  question_ambigue: "erreur_contenu",
  autre: "autre",
};

async function signaler(contexte: ContexteChapitre, motif: string, resume: string): Promise<void> {
  await avecAgentEvaluateur({ eleveId: contexte.eleveId, uniteId: contexte.uniteId }, (client) =>
    client.query(
      `insert into signalements (source, motif, priorite, eleve_id, chapitre_id, resume)
       values ('agent_evaluateur', $1, 2, $2, $3, $4)`,
      [motif, contexte.eleveId, contexte.chapitreId, resume.slice(0, 2000)],
    ),
  );
  await alerterVeilleSansAttendre();
}

export type ResultatSoumission = { ok: true } | { ok: false; erreur: string };

/**
 * Corrige et enregistre la tentative (une seule par quiz). Les réponses sont indexées comme les questions :
 * un nombre (option choisie) pour une question à choix, un texte pour une réponse courte, null si vide.
 */
export async function soumettreQuiz(
  contexte: ContexteChapitre,
  quizId: string,
  reponses: (number | string | null)[],
): Promise<ResultatSoumission> {
  if (!UUID.test(quizId)) return { ok: false, erreur: "Quiz inconnu." };
  // Rien n'est enregistré : l'élève pourra faire le quiz quand le service reviendra.
  if (!(await accesElevesOuvert()) || (await agentSuspendu("evaluateur")))
    return { ok: false, erreur: MESSAGE_AGENT_SUSPENDU };
  const agent = { eleveId: contexte.eleveId, uniteId: contexte.uniteId };
  const etat = await avecAgentEvaluateur(agent, async (client) => {
    const { rows } = await client.query(
      "select questions from quiz where id = $1 and chapitre_id = $2 and statut = 'valide'",
      [quizId, contexte.chapitreId],
    );
    const dejaFait = await client.query(
      "select 1 from tentatives_quiz where quiz_id = $1 and eleve_id = $2",
      [quizId, contexte.eleveId],
    );
    return { questions: rows[0]?.questions as Question[] | undefined, dejaFait: dejaFait.rowCount };
  });
  if (!etat.questions) return { ok: false, erreur: "Quiz inconnu." };
  if (etat.dejaFait)
    return { ok: false, erreur: "Tu as déjà fait ce quiz : ton score est enregistré." };
  if (reponses.length !== etat.questions.length)
    return { ok: false, erreur: "Réponses incomplètes : recharge la page." };

  // Les réponses courtes sont corrigées par le modèle : quota du jour pris avant les appels, gardé s'ils
  // échouent (revue de sécurité, S4), pour qu'un envoi répété ne coûte pas à volonté.
  if (
    etat.questions.some((q) => q.type === "reponse_courte") &&
    !(await prendreQuotaEleve(
      contexte.eleveId,
      "correction_quiz",
      entier("CORRECTIONS_QUIZ_PAR_JOUR", 20),
    ))
  )
    return { ok: false, erreur: "Tu as envoyé beaucoup de quiz aujourd'hui. Reviens demain." };
  const systeme = promptEvaluateur(contexte.codePays, contexte.uniteCode);
  const enregistrees: ReponseEnregistree[] = [];
  for (const [i, q] of etat.questions.entries()) {
    const r = reponses[i];
    if (q.type === "reponse_courte") {
      const texte = typeof r === "string" ? r.trim().slice(0, LONGUEUR_REPONSE_MAX) : "";
      let correction: Correction;
      if (!texte) {
        correction = corrigerChoix(q, null);
      } else {
        const resultat = await corrigerReponse({
          systeme,
          // Seul le texte envoyé au modèle est masqué (ADR 0062) ; la réponse enregistrée reste celle de l'élève.
          demande: { question: q, reponseEleve: masquerTexteEleve(texte) },
          modele: modeleDesAgents("evaluateur"),
          parametres: parametresCorrection(),
        });
        if (!resultat.sortie)
          return {
            ok: false,
            erreur:
              "La correction n'a pas pu être faite. Réessaie dans un moment : rien n'est enregistré.",
          };
        correction = resultat.sortie;
      }
      enregistrees.push({
        question: i,
        choix: null,
        texte: texte || null,
        points: POINTS[correction.resultat],
        correction,
      });
    } else {
      const choix =
        typeof r === "number" && Number.isInteger(r) && r >= 0 && r < q.options.length ? r : null;
      const correction = corrigerChoix(q, choix);
      enregistrees.push({
        question: i,
        choix: choix === null ? null : String(choix),
        texte: null,
        points: POINTS[correction.resultat],
        correction,
      });
    }
  }

  try {
    await avecAgentEvaluateur(agent, (client) =>
      client.query(
        "insert into tentatives_quiz (quiz_id, eleve_id, reponses, score) values ($1, $2, $3, $4)",
        [
          quizId,
          contexte.eleveId,
          JSON.stringify(enregistrees),
          score(enregistrees.map((e) => e.correction.resultat)),
        ],
      ),
    );
  } catch (erreur) {
    if (erreur instanceof DatabaseError && erreur.code === "23505")
      return { ok: false, erreur: "Tu as déjà fait ce quiz : ton score est enregistré." };
    throw erreur;
  }
  for (const e of enregistrees) {
    const motif = MOTIFS[e.correction.signalement];
    if (motif)
      await signaler(
        contexte,
        motif,
        `Évaluateur, question ${e.question + 1} : ${e.correction.motif_signalement || "à examiner"}`,
      );
  }
  return { ok: true };
}

export type ResultatContestation =
  { ok: true; reexamen: Correction; transmise: boolean } | { ok: false; erreur: string };

/**
 * Contestation d'une correction : réexamen par l'Évaluateur (le score ne change jamais), puis transmission
 * à un humain si l'Évaluateur le juge utile ou dès la deuxième contestation de la même question.
 */
export async function contesterCorrection(
  contexte: ContexteChapitre,
  quizId: string,
  question: number,
  message: string,
): Promise<ResultatContestation> {
  const texte = message.trim();
  if (!texte) return { ok: false, erreur: "Explique pourquoi tu contestes la correction." };
  if (!(await accesElevesOuvert()) || (await agentSuspendu("evaluateur")))
    return { ok: false, erreur: MESSAGE_AGENT_SUSPENDU };
  if (texte.length > 1000)
    return { ok: false, erreur: "Message trop long (1000 caractères au plus)." };
  const quiz = await quizPourEleve(contexte);
  if (!quiz || quiz.quizId !== quizId || !quiz.tentative)
    return { ok: false, erreur: "Quiz inconnu." };
  const reponse = quiz.tentative.reponses.find((r) => r.question === question);
  const q = quiz.tentative.questions[question];
  if (!reponse || !q) return { ok: false, erreur: "Question inconnue." };
  const precedentes = quiz.tentative.contestations.filter((c) => c.question === question);
  if (precedentes.length >= CONTESTATIONS_MAX)
    return { ok: false, erreur: "Ta contestation a déjà été transmise à un enseignant." };
  if (
    !(await prendreQuotaEleve(
      contexte.eleveId,
      "contestation_quiz",
      entier("CONTESTATIONS_PAR_JOUR", 10),
    ))
  )
    return {
      ok: false,
      erreur: "Tu as contesté plusieurs corrections aujourd'hui. Reviens demain.",
    };

  const reponseEleve =
    reponse.texte ??
    (reponse.choix !== null ? q.options[Number(reponse.choix)] : "(pas de réponse)");
  const resultat = await corrigerReponse({
    systeme: promptEvaluateur(contexte.codePays, contexte.uniteCode),
    demande: {
      question: q,
      reponseEleve: masquerTexteEleve(reponseEleve),
      contestation: {
        correction: reponse.correction,
        messages: [...precedentes.map((c) => c.message), texte].map(masquerTexteEleve),
      },
    },
    modele: modeleDesAgents("evaluateur"),
    parametres: parametresCorrection(),
  });
  if (!resultat.sortie)
    return { ok: false, erreur: "Le réexamen n'a pas pu être fait. Réessaie dans un moment." };
  const reexamen = resultat.sortie;

  await avecAgentEvaluateur({ eleveId: contexte.eleveId, uniteId: contexte.uniteId }, (client) =>
    client.query(
      "insert into contestations_quiz (tentative_id, question, message, reexamen) values ($1, $2, $3, $4)",
      [quiz.tentative!.id, question, texte, reexamen],
    ),
  );
  const motif = MOTIFS[reexamen.signalement];
  const transmise = motif !== null || precedentes.length + 1 >= CONTESTATIONS_MAX;
  if (transmise)
    await signaler(
      contexte,
      motif ?? "erreur_contenu",
      `Correction contestée (quiz version ${quiz.version}, question ${question + 1}, ${precedentes.length + 1} fois) : ${reexamen.motif_signalement || "à réexaminer par un enseignant"}`,
    );
  return { ok: true, reexamen, transmise };
}
