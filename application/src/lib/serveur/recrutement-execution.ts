import "server-only";
import { composerPrompt, dossierPack, racineDepot } from "@/lib/agents/chargeur-prompt";
import type { ParametresModele } from "@/lib/agents/professeur/boucle";
import { lireRecrutement, valeursRecrutement } from "@/lib/agents/recruteur/configuration";
import {
  controlerSortie,
  genererTacheRecruteur,
  type Action,
  type SortieRecruteur,
  type Tache,
} from "@/lib/agents/recruteur/tache";
import { libellesFamilles } from "@/lib/pack-pays/lecture";
import { coutUSD } from "@/lib/tests-agents/cout";
import { avecAgentRecruteur, avecUtilisateur } from "./base";
import { agentSuspendu, MESSAGE_AGENT_SUSPENDU } from "./disponibilite";
import { modeleDesAgents } from "./professeur";

// Tâche de l'agent Recruteur demandée par le propriétaire (ADR 0040). Lectures et écritures sous le rôle
// agent_recruteur, limité au candidat fixé : fiche (sans le contact), brouillons de messages, dossier d'accord,
// liste d'opposition. Le texte reçu du candidat n'est jamais conservé ; rien n'est envoyé ici.

export const SKILLS_RECRUTEUR = [
  "_commun/skills/contenu-non-fiable",
  "recruteur/skills/preselection-equitable",
];

function entier(nom: string, defaut: number): number {
  const v = Number(process.env[nom]);
  return Number.isInteger(v) && v > 0 ? v : defaut;
}

export function parametresRecruteur(): ParametresModele {
  const effort = process.env.EFFORT_RECRUTEUR ?? "medium";
  return {
    modele: process.env.MODELE_RECRUTEUR ?? "claude-opus-5-5",
    effort: (["low", "medium", "high", "xhigh", "max"].includes(effort)
      ? effort
      : "medium") as ParametresModele["effort"],
    maxTokens: entier("MAX_JETONS_RECRUTEUR", 8000),
  };
}

/** Refus explicite dans la réponse d'un candidat : enregistré même si l'agent l'a manqué. */
const REFUS_EXPLICITE = /\bstop\b|ne (me )?contactez (plus|pas)|ne plus (être|me) (contact|écri)/i;

const LIBELLES_ACTIONS: Record<Action, string> = {
  transmettre_responsable: "question à traiter par le responsable",
  enregistrer_refus: "refus enregistré",
  demande_suppression: "demande de suppression des données",
  piece_identite_non_conservee: "pièce d'identité reçue, non conservée",
  signaler_incoherence: "incohérence à vérifier, sans conclusion",
  signaler_contenu_suspect: "contenu suspect (instruction cachée)",
  verifier_secteur_public: "agent du secteur public : autorisation éventuelle à vérifier",
};

export type ResultatTacheRecruteur =
  | {
      ok: true;
      coutUSD: number;
      sortie: Pick<SortieRecruteur, "refus" | "reponse_au_responsable" | "escalade" | "actions">;
      messageCree: boolean;
      dossierCree: boolean;
      problemes: string[];
    }
  | { ok: false; erreur: string };

export async function executerTacheRecruteur(entree: {
  administrateur: string;
  candidatId: string;
  tache: Tache;
  informations: string | null;
  consigne: string | null;
}): Promise<ResultatTacheRecruteur> {
  if (await agentSuspendu("recruteur")) return { ok: false, erreur: MESSAGE_AGENT_SUSPENDU };
  const pays = await avecUtilisateur(entree.administrateur, (client) =>
    client
      .query(
        `select r.pays_code, p.nom from candidats c join referentiels r on r.id = c.referentiel_id
         join pays p on p.code = r.pays_code where c.id = $1`,
        [entree.candidatId],
      )
      .then((r) => r.rows[0] as { pays_code: string; nom: string } | undefined),
  );
  if (!pays) return { ok: false, erreur: "Candidat introuvable." };
  const contexte = { candidatId: entree.candidatId };
  const lu = await avecAgentRecruteur(contexte, async (client) => {
    const candidat = (
      await client.query(
        `select nom, famille, niveau, structure, source, source_detail, statut, adequation, points_a_verifier
         from candidats`,
      )
    ).rows[0];
    const historique = (
      await client.query(
        `select nature, statut, objet, to_char(envoye_le, 'YYYY-MM-DD') as envoye_le
         from messages_recrutement order by cree_le`,
      )
    ).rows;
    return { candidat, historique };
  });
  if (!lu.candidat) return { ok: false, erreur: "Candidat introuvable." };
  const pack = dossierPack(racineDepot(), pays.pays_code);
  const configuration = lireRecrutement(pack);
  if (!configuration) return { ok: false, erreur: "Recrutement non configuré pour ce pays." };
  const c = lu.candidat;
  const source =
    configuration.sources.find((s) => s.id === c.source)?.libelle ?? (c.source as string);
  const parametres = parametresRecruteur();
  const resultat = await genererTacheRecruteur({
    systeme: composerPrompt({
      agent: "recruteur",
      codePays: pays.pays_code,
      unite: "pays",
      skills: SKILLS_RECRUTEUR,
      valeursDynamiques: valeursRecrutement(configuration),
    }),
    demande: {
      tache: entree.tache,
      pays: pays.nom,
      famille: libellesFamilles(pack)[c.famille] ?? c.famille,
      candidat: {
        nom: entree.tache === "qualifier" ? null : c.nom,
        niveau: c.niveau,
        structure: c.structure,
        source: `${c.source} (${source}${c.source_detail ? ` : ${c.source_detail}` : ""})`,
        statut: c.statut,
        adequation: c.adequation,
        points_a_verifier: c.points_a_verifier,
      },
      historique: lu.historique,
      delaiRelanceJours: configuration.delaiRelanceJours,
      informations: entree.informations,
      consigne: entree.consigne,
    },
    modele: modeleDesAgents(),
    parametres,
  });
  const cout = resultat.consommations.reduce((s, x) => s + (coutUSD(parametres.modele, x) || 0), 0);
  if (!resultat.sortie) return { ok: false, erreur: `Réponse inexploitable (${resultat.arret}).` };
  const envoye = (nature: string) =>
    lu.historique.some((h) => h.nature === nature && h.statut === "envoye");
  const { sortie, problemes } = controlerSortie(resultat.sortie, {
    tache: entree.tache,
    statutCandidat: c.statut,
    premierContactEnvoye: envoye("premier_contact"),
    relanceEnvoyee: envoye("relance"),
    conditionsValidees: configuration.conditionsValidees !== null,
  });
  const actions = new Set(sortie.actions);
  if (
    entree.tache === "repondre" &&
    entree.informations &&
    REFUS_EXPLICITE.test(entree.informations) &&
    !actions.has("enregistrer_refus") &&
    !actions.has("demande_suppression")
  ) {
    actions.add("enregistrer_refus");
    problemes.push("Refus explicite détecté par le serveur : enregistré.");
  }
  const arret = actions.has("enregistrer_refus") || actions.has("demande_suppression");
  const enregistre = await avecAgentRecruteur(contexte, async (client) => {
    if (sortie.fiche) {
      await client.query(
        `update candidats set adequation = $1, justification = $2, points_a_verifier = $3,
           secteur_public_a_verifier = $4,
           statut = case when statut = 'identifie' then 'qualifie'::statut_candidat else statut end, maj_le = now()`,
        [
          sortie.fiche.adequation,
          sortie.fiche.justification.slice(0, 1500),
          sortie.fiche.points_a_verifier.slice(0, 10).map((p) => p.slice(0, 300)),
          sortie.fiche.secteur_public_a_verifier || actions.has("verifier_secteur_public"),
        ],
      );
    } else if (actions.has("verifier_secteur_public")) {
      await client.query("update candidats set secteur_public_a_verifier = true, maj_le = now()");
    }
    let messageCree = false;
    if (sortie.message_candidat && !arret) {
      await client.query(
        `insert into messages_recrutement (candidat_id, nature, objet, texte) values ($1, $2, $3, $4)`,
        [
          entree.candidatId,
          sortie.message_candidat.nature,
          sortie.message_candidat.objet.slice(0, 200),
          sortie.message_candidat.texte.slice(0, 5000),
        ],
      );
      messageCree = true;
    }
    let dossierCree = false;
    if (sortie.dossier_accord && !arret) {
      await client.query(
        `insert into dossiers_accord (candidat_id, resume, consentement_image_voix_separe, points_a_valider)
         values ($1, $2, $3, $4)`,
        [
          entree.candidatId,
          sortie.dossier_accord.resume.slice(0, 4000),
          sortie.dossier_accord.consentement_image_voix_separe,
          sortie.dossier_accord.points_a_valider.slice(0, 20).map((p) => p.slice(0, 500)),
        ],
      );
      await client.query(
        `update candidats set statut = 'accord_prepare', maj_le = now()
         where statut in ('qualifie', 'contacte', 'relance', 'en_echange', 'entretien')`,
      );
      dossierCree = true;
    }
    if (entree.tache === "repondre" && !arret)
      await client.query(
        `update candidats set statut = 'en_echange', maj_le = now() where statut in ('contacte', 'relance')`,
      );
    if (actions.has("demande_suppression"))
      await client.query("select enregistrer_opposition('suppression')");
    else if (actions.has("enregistrer_refus"))
      await client.query("select enregistrer_opposition('refus')");
    // Ce qui demande le responsable rejoint la file humaine (sans le texte du candidat).
    const aSignaler = [...actions].filter((a) => a !== "enregistrer_refus");
    if (aSignaler.length > 0)
      await client.query(
        `insert into signalements (source, motif, priorite, resume) values ('agent_recruteur', 'autre', $1, $2)`,
        [
          actions.has("demande_suppression") ? 2 : 3,
          `Recrutement (candidat ${entree.candidatId.slice(0, 8)}) : ${aSignaler
            .map((a) => LIBELLES_ACTIONS[a])
            .join(" ; ")}${sortie.escalade ? `. ${sortie.escalade}` : ""}`.slice(0, 2000),
        ],
      );
    return { messageCree, dossierCree };
  });
  return {
    ok: true,
    coutUSD: cout,
    sortie: {
      refus: sortie.refus,
      reponse_au_responsable: sortie.reponse_au_responsable,
      escalade: sortie.escalade,
      actions: [...actions],
    },
    ...enregistre,
    problemes,
  };
}
