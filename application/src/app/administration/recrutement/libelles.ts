// Libellés du pipeline de recrutement (le code brut s'affiche à défaut).
export const STATUTS_CANDIDAT: Record<string, string> = {
  identifie: "identifié",
  qualifie: "qualifié",
  contacte: "contacté",
  relance: "relancé",
  en_echange: "en échange",
  entretien: "entretien",
  accord_prepare: "accord préparé",
  signe: "accord signé",
  refus: "refus (opposition)",
  suppression_demandee: "suppression demandée",
};
export const ADEQUATIONS: Record<string, string> = {
  forte: "forte",
  moyenne: "moyenne",
  faible: "faible",
  impossible_a_evaluer: "impossible à évaluer",
};
export const NATURES: Record<string, string> = {
  premier_contact: "premier contact",
  relance: "relance",
  reponse: "réponse",
  invitation_entretien: "invitation à un entretien",
};
export const STATUTS_MESSAGE: Record<string, string> = {
  brouillon: "brouillon à approuver",
  approuve: "approuvé, non envoyé",
  envoye: "envoyé",
  annule: "annulé",
};
