import "server-only";
import type {
  EvenementVisionnage,
  LigneResultat,
  QuestionnaireOuvert,
} from "@/lib/exploitation/mesures";
import { avecUtilisateur, avecVisiteur } from "./base";

// Mesures du pilote (ADR 0052). Les règles (élève actif, chapitre validé, quota, une réponse par personne,
// réponses permises, administration seule pour les totaux) sont tenues par la base.

function entier(nom: string, defaut: number): number {
  const v = Number(process.env[nom]);
  return Number.isInteger(v) && v > 0 ? v : defaut;
}

export function noterVisionnage(
  eleve: string,
  chapitre: string,
  evenement: EvenementVisionnage,
): Promise<boolean> {
  return avecUtilisateur(eleve, (client) =>
    client
      .query("select noter_visionnage($1, $2, $3) as ok", [
        chapitre,
        evenement,
        entier("VISIONNAGES_PAR_JOUR", 60),
      ])
      .then((r) => r.rows[0].ok === true),
  );
}

export interface VisionnageChapitre {
  unite: string;
  chapitre: string;
  titre: string;
  videos_demarrees: number;
  videos_terminees: number;
  lecons_ouvertes: number;
}

export function visionnagesParChapitre(
  administrateur: string,
  jours: number,
): Promise<VisionnageChapitre[]> {
  return avecUtilisateur(administrateur, (client) =>
    client
      .query(
        `select unite, chapitre, titre, videos_demarrees::int, videos_terminees::int, lecons_ouvertes::int
         from visionnages_par_chapitre($1)`,
        [jours],
      )
      .then((r) => r.rows as VisionnageChapitre[]),
  );
}

export function questionnairePourEleve(eleve: string): Promise<QuestionnaireOuvert | null> {
  return avecUtilisateur(eleve, (client) =>
    client
      .query("select questionnaire_pour_eleve() as q")
      .then((r) => (r.rows[0]?.q as QuestionnaireOuvert | null) ?? null),
  );
}

export function repondreQuestionnaireEleve(
  eleve: string,
  reponses: Record<string, string>,
): Promise<boolean> {
  return avecUtilisateur(eleve, (client) =>
    client
      .query("select repondre_questionnaire_eleve($1) as ok", [reponses])
      .then((r) => r.rows[0].ok === true),
  );
}

export function questionnairePourParent(jeton: string): Promise<QuestionnaireOuvert | null> {
  return avecVisiteur((client) =>
    client
      .query("select questionnaire_pour_parent($1) as q", [jeton])
      .then((r) => (r.rows[0]?.q as QuestionnaireOuvert | null) ?? null),
  );
}

export function repondreQuestionnaireParent(
  jeton: string,
  reponses: Record<string, string>,
): Promise<boolean> {
  return avecVisiteur((client) =>
    client
      .query("select repondre_questionnaire_parent($1, $2) as ok", [jeton, reponses])
      .then((r) => r.rows[0].ok === true),
  );
}

export function resultatsQuestionnaires(administrateur: string): Promise<LigneResultat[]> {
  return avecUtilisateur(administrateur, (client) =>
    client
      .query(
        `select referentiel, version, public, question, texte, option, nombre::int, total::int
         from resultats_questionnaires()`,
      )
      .then((r) => r.rows as LigneResultat[]),
  );
}
