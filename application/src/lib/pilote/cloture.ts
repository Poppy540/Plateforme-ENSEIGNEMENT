// Clôture du pilote (docs/pilote/procedure.md, « Après » ; Jalon 14, étape 2 ; ADR 0085). Huit gestes : vérifiés
// par la plateforme quand la base le permet, sinon cochés par le propriétaire avec une preuve datée. Rien ici ne
// nomme un pays, une classe ou une matière. Fonctions pures : la page et les tests s'appuient dessus.

export type NatureGeste = "verifie" | "coche";
export type EtatGeste = "fait" | "a_faire" | "sans_objet";
export type Decision = "arreter" | "prolonger" | "elargir";

/** Agents qui parlent aux élèves ou aux parents : mis en veille si le pilote s'arrête. */
export const AGENTS_FACE_AUX_ELEVES = ["evaluateur", "professeur", "support", "tuteur"] as const;

export interface DefinitionGeste {
  code: string;
  titre: string;
  preuveAttendue: string;
  nature: NatureGeste;
}

export interface FaitsCloture {
  periode_debut: string | null;
  periode_fin: string | null;
  rapports_telecharges: number;
  decision: string | null;
  decision_le: string | null;
  acces_eleves_ouvert: boolean;
  agents_suspendus: string[];
}

export interface CocheGeste {
  geste: string;
  preuve: string;
  date_preuve: string;
}

export interface GesteEvalue extends DefinitionGeste {
  etat: EtatGeste;
  detail: string | null;
  coche: CocheGeste | null;
}

export const GESTES: readonly DefinitionGeste[] = [
  {
    code: "periode_terminee",
    titre: "Période du pilote terminée",
    preuveAttendue: "Dernier jour saisi et passé (Rapport de fin de pilote)",
    nature: "verifie",
  },
  {
    code: "questionnaires_fin",
    titre: "Questionnaires de fin proposés (élèves, parents volontaires, enseignant), puis fermés",
    preuveAttendue: "Dates d'ouverture et de fermeture, nombre de réponses",
    nature: "coche",
  },
  {
    code: "rapport_fin",
    titre: "Rapport de fin de pilote téléchargé après la fin",
    preuveAttendue: "Téléchargement noté par la plateforme",
    nature: "verifie",
  },
  {
    code: "reunion_bilan",
    titre: "Réunion de bilan tenue (propriétaire, référent, enseignant, établissement, veille)",
    preuveAttendue: "Date et compte rendu sans donnée personnelle",
    nature: "coche",
  },
  {
    code: "decision_finale",
    titre: "Décision du propriétaire : arrêter, prolonger ou élargir",
    preuveAttendue: "Notée au journal du pilote",
    nature: "verifie",
  },
  {
    code: "familles_informees",
    titre: "Familles et établissement informés de la décision, par le canal approuvé",
    preuveAttendue: "Date et canal du message",
    nature: "coche",
  },
  {
    code: "mise_en_veille",
    titre: "Si arrêt : accès des élèves fermé et agents face aux élèves suspendus",
    preuveAttendue: "État vérifié par la plateforme",
    nature: "verifie",
  },
  {
    code: "derniere_sauvegarde",
    titre: "Dernière sauvegarde faite et restauration essayée",
    preuveAttendue: "Date et dossier de la sauvegarde (pnpm base:sauvegarder)",
    nature: "coche",
  },
];

/** Décision lue dans le texte de l'entrée du journal (« Arrêter le pilote : … »). */
export function decisionDuTexte(texte: string | null): Decision | null {
  if (!texte) return null;
  if (texte.startsWith("Arrêter")) return "arreter";
  if (texte.startsWith("Prolonger")) return "prolonger";
  if (texte.startsWith("Élargir")) return "elargir";
  return null;
}

function verifier(
  code: string,
  f: FaitsCloture,
  aujourdhui: string,
): { etat: EtatGeste; detail: string } {
  const finie = f.periode_fin !== null && f.periode_fin < aujourdhui;
  if (code === "periode_terminee") {
    if (!f.periode_debut) return { etat: "a_faire", detail: "Période du pilote non saisie." };
    if (!f.periode_fin)
      return { etat: "a_faire", detail: "Pilote en cours : dernier jour non saisi." };
    return finie
      ? { etat: "fait", detail: `Dernier jour : ${f.periode_fin}.` }
      : { etat: "a_faire", detail: `Le pilote se termine le ${f.periode_fin}.` };
  }
  if (code === "rapport_fin")
    return f.rapports_telecharges > 0
      ? {
          etat: "fait",
          detail: `Téléchargé ${f.rapports_telecharges} fois depuis la fin du pilote.`,
        }
      : {
          etat: "a_faire",
          detail: finie
            ? "Pas encore téléchargé depuis la fin du pilote."
            : "À télécharger une fois le pilote terminé.",
        };
  const decision = decisionDuTexte(f.decision);
  if (code === "decision_finale")
    return decision
      ? { etat: "fait", detail: f.decision! }
      : { etat: "a_faire", detail: "Aucune décision finale notée au journal." };
  // mise_en_veille
  if (!decision) return { etat: "a_faire", detail: "Dépend de la décision finale." };
  if (decision !== "arreter")
    return { etat: "sans_objet", detail: "Sans objet : le pilote continue." };
  const actifs = AGENTS_FACE_AUX_ELEVES.filter((a) => !f.agents_suspendus.includes(a));
  if (f.acces_eleves_ouvert || actifs.length > 0)
    return {
      etat: "a_faire",
      detail: [
        f.acces_eleves_ouvert ? "accès des élèves encore ouvert" : null,
        actifs.length ? `agents encore actifs : ${actifs.join(", ")}` : null,
      ]
        .filter(Boolean)
        .join(" ; ")
        .replace(/^./, (c) => c.toUpperCase())
        .concat("."),
    };
  return { etat: "fait", detail: "Accès fermé, agents face aux élèves suspendus." };
}

export function evaluerCloture(
  faits: FaitsCloture,
  coches: readonly CocheGeste[],
  aujourdhui: string,
): GesteEvalue[] {
  return GESTES.map((d) => {
    if (d.nature === "verifie")
      return { ...d, ...verifier(d.code, faits, aujourdhui), coche: null };
    const coche = coches.find((c) => c.geste === d.code) ?? null;
    return { ...d, etat: coche ? "fait" : "a_faire", detail: null, coche };
  });
}

/** Décompte : la clôture est complète quand chaque geste est fait ou sans objet. */
export function decompteCloture(gestes: readonly GesteEvalue[]) {
  const faits = gestes.filter((g) => g.etat !== "a_faire").length;
  return { faits, total: gestes.length, complete: faits === gestes.length };
}
