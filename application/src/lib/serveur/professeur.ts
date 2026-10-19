import "server-only";
import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import {
  composerPrompt,
  dossierPack,
  lireValeurs,
  racineDepot,
} from "@/lib/agents/chargeur-prompt";
import { modeleAnthropic, type Modele } from "@/lib/agents/modele";
import { modeleSimule } from "@/lib/agents/modele-simule";
import { repondre, type ParametresModele } from "@/lib/agents/professeur/boucle";
import { prioriteSignalement, type AppelOutil } from "@/lib/agents/professeur/outils";
import { avecAgentProfesseur, avecUtilisateur } from "./base";
import { simulationAutorisee } from "./configuration";
import { alerterVeilleSansAttendre } from "./veille";
import { accesElevesOuvert, agentSuspendu, MESSAGE_AGENT_SUSPENDU } from "./disponibilite";

// Agent Professeur côté serveur : contexte vérifié, outils exécutés sous le rôle agent_professeur,
// échanges conservés, quota quotidien. Aucun contenu de conversation n'est écrit dans les journaux.

const SKILLS_PROFESSEUR = [
  "_commun/skills/contenu-non-fiable",
  "professeur/skills/echelle-d-indices",
  "professeur/skills/diagnostic-d-erreur",
];
const HISTORIQUE_MAX = 20;
export const LONGUEUR_QUESTION_MAX = 1000;

function entier(nom: string, defaut: number): number {
  const v = Number(process.env[nom]);
  return Number.isInteger(v) && v > 0 ? v : defaut;
}

/** Modèle de langage des agents : réel (API Claude) ou simulé (développement et test uniquement). */
export function modeleDesAgents(): Modele {
  const mode = process.env.MODE_MODELE ?? "anthropic";
  if (mode === "simulation") {
    if (!simulationAutorisee())
      throw new Error("MODE_MODELE=simulation est interdit hors développement et test.");
    return modeleSimule;
  }
  if (mode !== "anthropic") throw new Error(`MODE_MODELE inconnu : ${mode}`);
  return modeleAnthropic;
}

export function parametresModele(): ParametresModele {
  const effort = (process.env.EFFORT_PROFESSEUR ?? "medium") as ParametresModele["effort"];
  return {
    modele: process.env.MODELE_PROFESSEUR ?? "claude-opus-5-5",
    effort: ["low", "medium", "high", "xhigh", "max"].includes(effort) ? effort : "medium",
    maxTokens: entier("MAX_JETONS_PROFESSEUR", 16000),
  };
}

export interface ContexteChapitre {
  eleveId: string;
  uniteId: string;
  uniteCode: string;
  codePays: string;
  chapitreId: string;
  chapitreTitre: string;
}

/** Chapitre validé d'une unité du référentiel de l'élève actif ; null sinon. */
export function contexteChapitre(utilisateur: string, codeUnite: string, codeChapitre: string) {
  return avecUtilisateur(utilisateur, async (client): Promise<ContexteChapitre | null> => {
    const { rows } = await client.query(
      `select u.id as unite_id, u.code as unite_code, r.pays_code, c.id as chapitre_id, c.titre
       from eleves e
       join unites u on u.referentiel_id = e.referentiel_id and u.code = $2
       join referentiels r on r.id = u.referentiel_id
       join chapitres c on c.unite_id = u.id and c.code = $3 and c.statut = 'valide'
       where e.id = $1 and e.statut = 'actif'`,
      [utilisateur, codeUnite, codeChapitre],
    );
    const r = rows[0];
    return r
      ? {
          eleveId: utilisateur,
          uniteId: r.unite_id,
          uniteCode: r.unite_code,
          codePays: r.pays_code,
          chapitreId: r.chapitre_id,
          chapitreTitre: r.titre,
        }
      : null;
  });
}

/** Nom affiché du professeur de l'unité (configuration du pack pays). */
export function nomProfesseur(contexte: ContexteChapitre): string {
  try {
    return (
      lireValeurs(dossierPack(racineDepot(), contexte.codePays), "professeur", contexte.uniteCode)
        .NOM_AVATAR ?? "Le professeur"
    );
  } catch {
    return "Le professeur";
  }
}

export function echangesDuChapitre(utilisateur: string, chapitreId: string) {
  return avecUtilisateur(utilisateur, async (client) => {
    const { rows } = await client.query(
      `select auteur, contenu from echanges_professeur
       where eleve_id = $1 and chapitre_id = $2 order by id desc limit 50`,
      [utilisateur, chapitreId],
    );
    return (rows as { auteur: "eleve" | "professeur"; contenu: string }[]).reverse();
  });
}

export type ResultatQuestion =
  { ok: true; flux: ReadableStream<Uint8Array> } | { ok: false; statut: number; erreur: string };

export async function poserQuestion(
  contexte: ContexteChapitre,
  question: string,
): Promise<ResultatQuestion> {
  if (!(await accesElevesOuvert()) || (await agentSuspendu("professeur")))
    return { ok: false, statut: 503, erreur: MESSAGE_AGENT_SUSPENDU };
  const agent = { eleveId: contexte.eleveId, uniteId: contexte.uniteId };
  const limite = entier("QUESTIONS_PAR_JOUR", 40);

  const preparation = await avecAgentProfesseur(agent, async (client) => {
    // Verrou par élève le temps de la transaction : des envois simultanés ne dépassent pas le quota.
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [contexte.eleveId]);
    const quota = await client.query(
      `select count(*)::int as n from echanges_professeur
       where eleve_id = $1 and auteur = 'eleve' and cree_le > now() - interval '1 day'`,
      [contexte.eleveId],
    );
    if (quota.rows[0].n >= limite) return null;
    const chapitres = await client.query(
      "select titre from chapitres where unite_id = $1 and statut = 'valide' order by ordre",
      [contexte.uniteId],
    );
    const historique = await client.query(
      `select auteur, contenu from echanges_professeur
       where eleve_id = $1 and chapitre_id = $2 order by id desc limit $3`,
      [contexte.eleveId, contexte.chapitreId, HISTORIQUE_MAX],
    );
    await client.query(
      "insert into echanges_professeur (eleve_id, chapitre_id, auteur, contenu) values ($1, $2, 'eleve', $3)",
      [contexte.eleveId, contexte.chapitreId, question],
    );
    return {
      listeChapitres: chapitres.rows.map((c) => c.titre as string).join(" ; "),
      historique: (historique.rows as { auteur: string; contenu: string }[]).reverse(),
    };
  });
  if (!preparation) {
    return {
      ok: false,
      statut: 429,
      erreur: "Tu as posé beaucoup de questions aujourd'hui. Reviens demain !",
    };
  }

  // Le prompt (stable pour l'unité) est mis en cache ; le chapitre en cours est donné dans le contexte de session.
  const systeme = composerPrompt({
    agent: "professeur",
    codePays: contexte.codePays,
    unite: contexte.uniteCode,
    skills: SKILLS_PROFESSEUR,
    valeursDynamiques: {
      LISTE_CHAPITRES: preparation.listeChapitres,
      CHAPITRE_EN_COURS: "en cours (voir le contexte de la session)",
    },
  });
  const historique: BetaMessageParam[] = preparation.historique.map((e) => ({
    role: e.auteur === "eleve" ? "user" : "assistant",
    content: e.contenu,
  }));
  const contexteSession = `# CONTEXTE DE LA SESSION\nChapitre en cours : « ${contexte.chapitreTitre} ».`;

  const executerOutil = async (appel: AppelOutil) => {
    const reponse = await avecAgentProfesseur(agent, async (client) => {
      if (appel.nom === "enregistrer_progression") {
        await client.query(
          `insert into progression (eleve_id, chapitre_id, statut) values ($1, $2, $3)
           on conflict (eleve_id, chapitre_id) do update set statut = excluded.statut, maj_le = now()`,
          [contexte.eleveId, contexte.chapitreId, appel.statut],
        );
        return "Progression enregistrée.";
      }
      await client.query(
        `insert into signalements (source, motif, priorite, eleve_id, chapitre_id, resume)
         values ('agent_professeur', $1, $2, $3, $4, $5)`,
        [
          appel.motif,
          prioriteSignalement(appel.motif),
          contexte.eleveId,
          contexte.chapitreId,
          appel.resume,
        ],
      );
      return "Signalement transmis à un humain.";
    });
    // Après la transaction (signalement enregistré) : la veille est prévenue sans attendre l'exécuteur.
    if (appel.nom !== "enregistrer_progression") await alerterVeilleSansAttendre();
    return reponse;
  };

  const encodeur = new TextEncoder();
  const flux = new ReadableStream<Uint8Array>({
    async start(controleur) {
      try {
        const sortie = await repondre({
          systeme,
          contexteSession,
          historique,
          question,
          modele: modeleDesAgents(),
          parametres: parametresModele(),
          executerOutil,
          emettre: (texte) => controleur.enqueue(encodeur.encode(texte)),
        });
        if (sortie.texte.trim()) {
          await avecAgentProfesseur(agent, (client) =>
            client.query(
              "insert into echanges_professeur (eleve_id, chapitre_id, auteur, contenu) values ($1, $2, 'professeur', $3)",
              [contexte.eleveId, contexte.chapitreId, sortie.texte.slice(0, 20000)],
            ),
          );
        }
        console.info(
          JSON.stringify({
            evenement: "reponse_professeur",
            unite: contexte.uniteCode,
            arret: sortie.arret,
            outils: sortie.appels.map((a) => a.nom),
          }),
        );
      } catch (erreur) {
        console.error(
          JSON.stringify({
            evenement: "erreur_professeur",
            unite: contexte.uniteCode,
            type: (erreur as Error).name,
          }),
        );
        controleur.enqueue(
          encodeur.encode(
            "\n\nLe professeur n'est pas disponible pour le moment. Réessaie plus tard.",
          ),
        );
      } finally {
        controleur.close();
      }
    },
  });
  return { ok: true, flux };
}
