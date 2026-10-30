// Ce qui attend le propriétaire (Jalon 15, étape 2 ; ADR 0089) : une liste unique, tirée des bilans des Jalons 6
// à 14 (§ « Décisions et actions attendues »). L'état est calculé quand la plateforme peut le voir (conditions du
// pilote, période, chapitres, classe, questionnaire et seuils du pack, skills encore « à valider ») ; sinon le
// point reste « à confirmer par vous » et se suit dans docs/attentes-proprietaire.md. Rien ici ne nomme un pays.
// Fonctions pures.

export type Theme =
  "juriste" | "cadre" | "referents" | "agents" | "hebergement" | "pendant" | "facultatif";
export type EtatAttente = "fait" | "a_faire" | "a_confirmer";

export const THEMES: Record<Theme, string> = {
  juriste: "Juriste",
  cadre: "Cadre du pilote, avec l'établissement",
  referents: "Référents et contenus",
  agents: "Agents : relecture, clé et essais réels",
  hebergement: "Hébergement, fournisseurs et déploiement",
  pendant: "Pendant et après le pilote",
  facultatif: "Facultatif",
};

export interface FaitsAttentes {
  /** État de chaque condition du pilote (ADR 0078), par numéro. */
  conditions: Record<number, "remplie" | "a_faire" | "a_revoir">;
  periodeSaisie: boolean;
  chapitresPilote: number;
  classes: number;
  /** null : pays du pilote inconnu (aucun chapitre du pilote) ou pas de questionnaire dans le pack. */
  questionnaireValide: boolean | null;
  /** Aucun critère de suspension « non surveillé » faute de seuil (budget compris). */
  seuilsComplets: boolean;
  /** Skills du projet dont le fichier porte encore « À valider par le propriétaire ». */
  skillsAValider: string[];
}

export interface Attente {
  code: string;
  theme: Theme;
  titre: string;
  /** Où agir : page de l'administration ou document. */
  ou: string;
  /** Ce que cela débloque. */
  debloque: string;
  verifier?: (f: FaitsAttentes) => boolean;
}

export interface AttenteEvaluee extends Attente {
  etat: EtatAttente;
}

const condition = (n: number) => (f: FaitsAttentes) => f.conditions[n] === "remplie";

export const ATTENTES: readonly Attente[] = [
  {
    code: "juriste",
    theme: "juriste",
    titre:
      "Obtenir l'avis écrit du juriste (dossier, question Q19, durées de conservation, fiche « Après l'essai », version établissement des rapports)",
    ou: "docs/juridique/dossier-juriste.md, puis condition 1 dans « Conditions du pilote »",
    debloque: "La classe pilote, les durées de conservation, la décision de démarrer",
    verifier: condition(1),
  },
  {
    code: "etablissement",
    theme: "cadre",
    titre: "Obtenir l'accord écrit de l'établissement",
    ou: "Condition 2 dans « Conditions du pilote »",
    debloque: "La classe pilote et la décision de démarrer",
    verifier: condition(2),
  },
  {
    code: "dates",
    theme: "cadre",
    titre: "Fixer avec l'établissement les dates du pilote et le format du rapport de fin",
    ou: "« Rapport de fin de pilote » (période)",
    debloque: "Le tableau de bord, le rapport de fin, la clôture",
    verifier: (f) => f.periodeSaisie,
  },
  {
    code: "chapitres",
    theme: "cadre",
    titre: "Désigner les chapitres du pilote",
    ou: "« Chapitres du pilote »",
    debloque: "L'espace du référent (pilote en tête), les critères de suspension",
    verifier: (f) => f.chapitresPilote > 0,
  },
  {
    code: "classe",
    theme: "cadre",
    titre: "Créer la classe pilote et inviter son enseignant (après la réponse du juriste à Q19)",
    ou: "« Classes du pilote »",
    debloque: "La vue d'ensemble de l'enseignant ; la condition 2",
    verifier: (f) => f.classes > 0,
  },
  {
    code: "referents",
    theme: "referents",
    titre: "Recruter et inviter les référents : Mathématiques d'abord, puis Sciences et Français",
    ou: "« Inviter un référent » ; guide du référent",
    debloque: "La validation des contenus ; la condition 3",
    verifier: condition(3),
  },
  {
    code: "contenus",
    theme: "referents",
    titre: "Faire valider 3 à 5 chapitres du pilote par le référent (chapitre, script, quiz)",
    ou: "Espace du référent ; condition 4",
    debloque: "La décision de démarrer",
    verifier: condition(4),
  },
  {
    code: "valeurs",
    theme: "referents",
    titre:
      "Valider les valeurs provisoires du pack (FAQ, délais, fiches des agents, durées), avec le référent et le juriste",
    ou: "referentiels/<pays>/ et SOURCES.md ; condition 10",
    debloque: "La décision de démarrer",
    verifier: condition(10),
  },
  {
    code: "questionnaire",
    theme: "referents",
    titre: "Valider le questionnaire anonyme (élèves et parents)",
    ou: "questionnaire.yaml du pack (statut « valide »)",
    debloque: "Le questionnaire dans la plateforme et ses résultats aux rapports",
    verifier: (f) => f.questionnaireValide === true,
  },
  {
    code: "skills",
    theme: "agents",
    titre: "Relire et valider les skills « élèves mineurs » et « files d'approbation »",
    ou: "agents/_commun/skills/eleves-mineurs/SKILL.md, agents/coordinateur/skills/files-d-approbation/SKILL.md",
    debloque: "Les essais réels des agents",
    verifier: (f) => f.skillsAValider.length === 0,
  },
  {
    code: "cle_api",
    theme: "agents",
    titre:
      "Fournir la clé API (dans l'environnement, jamais dans la conversation) et donner l'accord sur le coût des essais réels (~121 USD)",
    ou: "Variable ANTHROPIC_API_KEY du serveur ; condition 5",
    debloque: "Les essais réels des agents, puis la décision de démarrer",
    verifier: condition(5),
  },
  {
    code: "seuils",
    theme: "agents",
    titre: "Valider les seuils du suivi et fixer le budget des agents par semaine",
    ou: "Section « pilote » de pays.yaml ; « Critères de suspension »",
    debloque: "La surveillance de tous les critères de suspension ; la condition 11",
    verifier: (f) => f.seuilsComplets && f.conditions[11] === "remplie",
  },
  {
    code: "hebergement",
    theme: "hebergement",
    titre:
      "Choisir et déployer l'hébergement (2 processus par serveur), Supabase, sauvegardes chiffrées avec age (clé privée hors du serveur) et restauration essayée ; SEL_OPPOSITION fixé une fois pour toutes",
    ou: "Guide de mise en route (E1, E2) ; `pnpm repetition` avant ; condition 6",
    debloque: "Le site réel",
    verifier: condition(6),
  },
  {
    code: "messages",
    theme: "hebergement",
    titre: "Brancher les SMS ou emails réels et approuver les modèles de messages",
    ou: "Dossier de production ; condition 7",
    debloque: "Les codes de connexion, les messages aux parents",
    verifier: condition(7),
  },
  {
    code: "veille",
    theme: "hebergement",
    titre: "Nommer l'équipe de veille et tester l'alerte de détresse sur un vrai téléphone",
    ou: "Procédure de détresse ; conditions 8 et 9",
    debloque: "La sécurité des élèves pendant le pilote",
    verifier: (f) => f.conditions[8] === "remplie" && f.conditions[9] === "remplie",
  },
  {
    code: "repetition",
    theme: "hebergement",
    titre:
      "Refaire la répétition sur le site déployé ; `pnpm verifier:site https://<adresse>` doit finir par « Site conforme »",
    ou: "docs/pilote/repetition.md ; condition 12",
    debloque: "La décision de démarrer",
    verifier: condition(12),
  },
  {
    code: "github",
    theme: "hebergement",
    titre: "Débloquer GitHub Actions (réglages du dépôt et facturation du compte)",
    ou: "GitHub : Settings → Actions, et Billing",
    debloque: "Les contrôles automatiques à chaque envoi",
  },
  {
    code: "suivi",
    theme: "pendant",
    titre:
      "Chaque semaine : « Critères de suspension », « Semaine du pilote », puis le point au journal",
    ou: "Tableau de bord du pilote",
    debloque: "Le suivi du pilote",
  },
  {
    code: "fin",
    theme: "pendant",
    titre:
      "À la fin : « Clôture du pilote » jusqu'à 8 / 8, puis « Sort des données » avec le juriste",
    ou: "Tableau de bord du pilote",
    debloque: "La fin propre du pilote",
  },
  {
    code: "avatar",
    theme: "facultatif",
    titre: "Choisir un fournisseur d'avatar (sinon, le pilote s'appuie sur les leçons écrites)",
    ou: "Dossier de production §3 bis",
    debloque: "Les vidéos des professeurs avatars",
  },
  {
    code: "surveillance",
    theme: "facultatif",
    titre: "Choisir un service de surveillance des erreurs",
    ou: "Dossier de production (journal d'erreurs)",
    debloque: "Les alertes d'erreur hors du serveur",
  },
  {
    code: "lecteur_ecran",
    theme: "facultatif",
    titre: "Essayer la plateforme avec un lecteur d'écran sur un téléphone d'entrée de gamme",
    ou: "Avec l'établissement, pendant le pilote",
    debloque: "L'accessibilité vérifiée en conditions réelles",
  },
];

export function evaluerAttentes(f: FaitsAttentes): AttenteEvaluee[] {
  return ATTENTES.map((a) => ({
    ...a,
    etat: a.verifier ? (a.verifier(f) ? "fait" : "a_faire") : "a_confirmer",
  }));
}

/** Décompte : points faits, à faire (vérifiés par la plateforme) et à confirmer par le propriétaire. */
export function decompteAttentes(attentes: readonly AttenteEvaluee[]) {
  const compter = (e: EtatAttente) => attentes.filter((a) => a.etat === e).length;
  return { faits: compter("fait"), aFaire: compter("a_faire"), aConfirmer: compter("a_confirmer") };
}
