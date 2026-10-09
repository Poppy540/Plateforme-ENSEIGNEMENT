import "server-only";
import { DatabaseError } from "pg";
import { composerPrompt } from "@/lib/agents/chargeur-prompt";
import {
  controlerRapport,
  genererRapport,
  repondreAuParent,
  type FaitsRapport,
  type Rapport,
  type ReponseParent,
} from "@/lib/agents/tuteur/rapport";
import { avecAgentTuteur, avecServiceMessagerie, avecUtilisateur, avecVisiteur } from "./base";
import { agentSuspendu, MESSAGE_AGENT_SUSPENDU } from "./disponibilite";
import { envoyerMessage } from "./messagerie";
import { modeleDesAgents } from "./professeur";
import { parametresTuteur } from "./tuteur";

// Rapports du Tuteur aux parents (ADR 0027, 0031) : accord séparé demandé par l'élève, accepté par le parent
// par lien, révocable ; rapport hebdomadaire et à la demande ; envoi par le service de messagerie (le Tuteur
// ne voit jamais le contact) ; lien propre à chaque rapport pour le lire, en redemander un ou arrêter.

export const LONGUEUR_QUESTION_MAX = 500;

const prompt = (codePays: string) =>
  composerPrompt({
    agent: "tuteur",
    codePays,
    unite: "pays",
    skills: ["_commun/skills/contenu-non-fiable"],
    valeursDynamiques: {},
  });

export type EtatAccord = "aucun" | "en_attente" | "actif";

export function etatAccordRapports(eleve: string): Promise<EtatAccord> {
  return avecUtilisateur(eleve, async (client) => {
    const { rows } = await client.query(
      `select accorde_le from consentements
       where eleve_id = $1 and type = 'rapport_parents' and revoque_le is null order by demande_le desc limit 1`,
      [eleve],
    );
    return rows[0] ? (rows[0].accorde_le ? "actif" : "en_attente") : "aucun";
  });
}

export async function demanderAccordRapports(
  eleve: string,
  contact: string | null,
  urlDuSite: string,
): Promise<string | null> {
  try {
    const { jeton, contact: destinataire } = await avecUtilisateur(eleve, (client) =>
      client
        .query("select * from demander_consentement_rapports($1)", [contact])
        .then((r) => r.rows[0]),
    );
    await envoyerMessage(
      destinataire,
      `Votre enfant vous propose de recevoir chaque semaine un court rapport sur sa progression (plateforme de cours en ligne). Pour accepter : ${urlDuSite}/parent/rapports/accord?jeton=${encodeURIComponent(jeton)} — sinon, ignorez ce message.`,
    );
    return null;
  } catch (erreur) {
    if (erreur instanceof DatabaseError && erreur.code === "22023") return erreur.message;
    throw erreur;
  }
}

export function retirerAccordRapports(eleve: string): Promise<boolean> {
  return avecUtilisateur(eleve, (client) =>
    client.query("select revoquer_rapports_parents() as ok").then((r) => r.rows[0].ok as boolean),
  );
}

export function accepterAccordRapports(jeton: string): Promise<boolean> {
  return avecVisiteur((client) =>
    client
      .query("select accepter_rapports_parents($1) as ok", [jeton])
      .then((r) => r.rows[0].ok as boolean),
  );
}

/** Faits des 7 derniers jours, lus sous le rôle du Tuteur pour cet élève seulement. */
async function faitsDeLaSemaine(
  eleve: string,
): Promise<{ faits: FaitsRapport; codePays: string } | null> {
  return avecAgentTuteur(eleve, async (client) => {
    const e = (
      await client.query(
        "select r.pays_code from eleves e join referentiels r on r.id = e.referentiel_id where e.id = $1",
        [eleve],
      )
    ).rows[0];
    if (!e) return null;
    const progression = (
      await client.query(
        `select c.titre, p.statut from progression p join chapitres c on c.id = p.chapitre_id
         where p.eleve_id = $1 and p.maj_le > now() - interval '7 days'`,
        [eleve],
      )
    ).rows;
    const quiz = (
      await client.query(
        `select c.titre as chapitre, t.score::float as score from tentatives_quiz t
         join quiz q on q.id = t.quiz_id join chapitres c on c.id = q.chapitre_id
         where t.eleve_id = $1 and t.corrige_le > now() - interval '7 days' order by t.corrige_le`,
        [eleve],
      )
    ).rows;
    const plan = (
      await client.query(
        "select priorites from recommandations_tuteur where eleve_id = $1 order by cree_le desc limit 1",
        [eleve],
      )
    ).rows[0];
    const jours = Number((await client.query("select jours_sans_activite() as j")).rows[0]?.j ?? 0);
    return {
      codePays: e.pays_code,
      faits: {
        joursDepuisDerniereActivite: jours,
        chapitresTermines: progression.filter((p) => p.statut === "termine").map((p) => p.titre),
        chapitresEnCours: progression.filter((p) => p.statut === "en_cours").map((p) => p.titre),
        quiz,
        priorites: ((plan?.priorites ?? []) as { titre: string }[]).map((p) => p.titre),
      },
    };
  });
}

export type ResultatRapport = { ok: true } | { ok: false; erreur: string };

/** Prépare un rapport (Tuteur, accord vérifié par la base) et l'envoie par le service de messagerie. */
export async function preparerEtEnvoyerRapport(
  eleve: string,
  consentementId: string,
  periode: "hebdomadaire" | "a_la_demande",
  urlDuSite: string,
): Promise<ResultatRapport> {
  if (await agentSuspendu("tuteur")) return { ok: false, erreur: MESSAGE_AGENT_SUSPENDU };
  const donnees = await faitsDeLaSemaine(eleve);
  if (!donnees) return { ok: false, erreur: "Élève introuvable." };
  const resultat = await genererRapport({
    systeme: prompt(donnees.codePays),
    faits: donnees.faits,
    periode,
    modele: modeleDesAgents(),
    parametres: parametresTuteur(),
  });
  if (!resultat.sortie || controlerRapport(resultat.sortie).length > 0)
    return { ok: false, erreur: "Le rapport n'a pas pu être préparé. Réessayez plus tard." };
  const rapport = resultat.sortie;
  let rapportId: string;
  try {
    rapportId = await avecAgentTuteur(eleve, (client) =>
      client
        .query(
          `insert into rapports_parents (eleve_id, consentement_id, periode, contenu)
           values ($1, $2, $3, $4) returning id`,
          [eleve, consentementId, periode, { ...rapport, faits: donnees.faits }],
        )
        .then((r) => r.rows[0].id as string),
    );
  } catch (erreur) {
    if (erreur instanceof DatabaseError && erreur.code === "42501")
      return { ok: false, erreur: "Aucun accord actif pour les rapports." };
    throw erreur;
  }
  const envoi = await avecServiceMessagerie((client) =>
    client.query("select * from preparer_envoi_rapport($1)", [rapportId]).then((r) => r.rows[0]),
  );
  if (!envoi) return { ok: false, erreur: "Aucun accord actif pour les rapports." };
  await envoyerMessage(
    envoi.contact,
    `Rapport ${periode === "hebdomadaire" ? "de la semaine" : "demandé"} sur la progression de votre enfant : ${rapport.progression} Le rapport complet, et pour en demander un autre ou arrêter les rapports : ${urlDuSite}/parent/rapport?jeton=${encodeURIComponent(envoi.jeton)}`,
  );
  return { ok: true };
}

/** Rapports hebdomadaires dus (appel planifié). Renvoie le nombre de rapports envoyés. */
export async function envoyerRapportsHebdomadaires(urlDuSite: string): Promise<number> {
  // Tuteur suspendu : les rapports dus partiront au premier passage après sa réactivation.
  if (await agentSuspendu("tuteur")) return 0;
  const dus = await avecAgentTuteur(null, (client) =>
    client
      .query("select eleve_id, consentement_id from rapports_hebdomadaires_dus()")
      .then((r) => r.rows),
  );
  let envoyes = 0;
  for (const d of dus) {
    const r = await preparerEtEnvoyerRapport(
      d.eleve_id,
      d.consentement_id,
      "hebdomadaire",
      urlDuSite,
    );
    if (r.ok) envoyes++;
  }
  return envoyes;
}

export interface RapportParent {
  prenom: string;
  rapport: Rapport;
  creeLe: string;
  accordActif: boolean;
}

interface LigneRapport {
  prenom: string;
  contenu: Rapport & { faits?: FaitsRapport };
  cree_le: string;
  accord_actif: boolean;
  eleve_id: string;
  consentement_id: string;
}

const ligneParJeton = (jeton: string) =>
  avecVisiteur((client) =>
    client
      .query("select * from rapport_par_jeton($1)", [jeton])
      .then((r) => r.rows[0] as LigneRapport | undefined),
  );

export async function rapportPourParent(jeton: string): Promise<RapportParent | null> {
  const l = await ligneParJeton(jeton);
  return l
    ? { prenom: l.prenom, rapport: l.contenu, creeLe: l.cree_le, accordActif: l.accord_actif }
    : null;
}

export async function arreterRapports(jeton: string): Promise<boolean> {
  return avecVisiteur((client) =>
    client
      .query("select arreter_rapports_parents($1) as ok", [jeton])
      .then((r) => r.rows[0].ok as boolean),
  );
}

/** Rapport à la demande du parent : accord actif et pas plus d'un par jour. */
export async function demanderRapportMaintenant(
  jeton: string,
  urlDuSite: string,
): Promise<ResultatRapport> {
  const l = await ligneParJeton(jeton);
  if (!l || !l.accord_actif)
    return { ok: false, erreur: "Les rapports ne sont plus actifs pour cet élève." };
  const recent = await avecAgentTuteur(l.eleve_id, (client) =>
    client
      .query(
        "select count(*)::int as n from rapports_parents where eleve_id = $1 and cree_le > now() - interval '1 day'",
        [l.eleve_id],
      )
      .then((r) => r.rows[0].n as number),
  );
  if (recent > 0)
    return { ok: false, erreur: "Un rapport a déjà été envoyé aujourd'hui. Réessayez demain." };
  return preparerEtEnvoyerRapport(l.eleve_id, l.consentement_id, "a_la_demande", urlDuSite);
}

/** Question d'un parent au Tuteur (depuis le lien d'un rapport) : jamais de comparaison, rien sans accord. */
export async function questionDuParent(
  jeton: string,
  question: string,
): Promise<{ ok: true; reponse: ReponseParent } | { ok: false; erreur: string }> {
  const texte = question.trim();
  if (!texte || texte.length > LONGUEUR_QUESTION_MAX)
    return { ok: false, erreur: `Question de 1 à ${LONGUEUR_QUESTION_MAX} caractères.` };
  if (await agentSuspendu("tuteur")) return { ok: false, erreur: MESSAGE_AGENT_SUSPENDU };
  const l = await ligneParJeton(jeton);
  if (!l) return { ok: false, erreur: "Lien invalide." };
  // Le pays vient toujours du compte de l'élève ; les faits ne sont transmis qu'avec un accord actif.
  const donnees = await faitsDeLaSemaine(l.eleve_id);
  if (!donnees) return { ok: false, erreur: "Lien invalide." };
  const resultat = await repondreAuParent({
    systeme: prompt(donnees.codePays),
    question: texte,
    accordActif: l.accord_actif,
    faits: l.accord_actif ? donnees.faits : null,
    modele: modeleDesAgents(),
    parametres: parametresTuteur(),
  });
  if (!resultat.sortie)
    return { ok: false, erreur: "Réponse impossible pour le moment. Réessayez plus tard." };
  if (resultat.sortie.a_transmettre && l.accord_actif)
    await avecAgentTuteur(l.eleve_id, (client) =>
      client.query(
        `insert into signalements (source, motif, priorite, eleve_id, resume)
         values ('agent_tuteur', 'autre', 2, $1, 'Demande d''un parent hors du périmètre du Tuteur : à traiter par un humain.')`,
        [l.eleve_id],
      ),
    );
  return { ok: true, reponse: resultat.sortie };
}
