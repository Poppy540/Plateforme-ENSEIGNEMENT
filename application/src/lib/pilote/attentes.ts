// Ce qui attend le propriétaire (Jalon 15, étape 2 ; ADR 0089 ; par urgence depuis le Jalon 23, ADR 0116) : une
// liste unique, tirée des bilans des Jalons 6 à 22 (§ « Décisions et actions attendues »). L'état est calculé quand la plateforme peut le voir (conditions du
// pilote, période, chapitres, classe, questionnaire et seuils du pack, skills encore « à valider ») ; sinon le
// point reste « à confirmer par vous » et se suit dans docs/attentes-proprietaire.md. Rien ici ne nomme un pays.
// Fonctions pures.

/** Ordre d'urgence (Jalon 23, ADR 0116) : d'abord ce qui prend le plus de temps ou débloque le reste. */
export type Urgence =
  "maintenant" | "avant_deploiement" | "avant_demarrage" | "pendant" | "facultatif";
export type EtatAttente = "fait" | "a_faire" | "a_confirmer";

export const URGENCES: Record<Urgence, string> = {
  maintenant: "1. Maintenant : ce qui prend le plus de temps",
  avant_deploiement: "2. Avant de déployer le site",
  avant_demarrage: "3. Avant de démarrer le pilote",
  pendant: "4. Pendant et après le pilote",
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
  urgence: Urgence;
  titre: string;
  /** Qui agit (le propriétaire, souvent avec une autre personne). */
  qui: string;
  /** Temps indicatif : celui du propriétaire, puis l'attente éventuelle. */
  delai: string;
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
    urgence: "maintenant",
    titre:
      "Obtenir l'avis écrit du juriste (dossier, questions Q19 et Q20, durées de conservation, fiche « Après l'essai », version établissement des rapports)",
    qui: "Vous, avec un juriste local",
    delai:
      "Une demi-journée pour trouver le juriste et envoyer le dossier ; puis 2 à 4 semaines de réponse",
    ou: "docs/juridique/dossier-juriste.md (lettre à compléter et signer), puis condition 1 dans « Conditions du pilote »",
    debloque: "La classe pilote, les durées de conservation, la décision de démarrer",
    verifier: condition(1),
  },
  {
    code: "curriculum",
    urgence: "maintenant",
    titre:
      "Obtenir le programme officiel de l'unité du pilote (par compétences s'il y en a), le format de son examen et la liste des manuels retenus",
    qui: "Vous, avec l'institution chargée des programmes ou l'établissement",
    delai: "1 h pour compléter et envoyer la lettre ; puis le délai de réponse",
    ou: "docs/pilote/demande-curriculum.md",
    debloque: "Le programme du pilote complet et sourcé (Jalon 21, étapes 2 et 3)",
  },
  {
    code: "referents",
    urgence: "maintenant",
    titre:
      "Recruter et inviter les référents : Mathématiques d'abord, puis Sciences et Français ; avec le premier, la séance de prise en main sur l'espace d'entraînement",
    qui: "Vous, avec l'établissement ou votre réseau",
    delai: "Quelques semaines pour trouver ; 15 minutes pour inviter ; 1 h de prise en main",
    ou: "« Inviter un référent » ; guide et kit du référent",
    debloque: "La validation des contenus ; la condition 3",
    verifier: condition(3),
  },
  {
    code: "skills",
    urgence: "maintenant",
    titre: "Relire et valider les skills « élèves mineurs » et « files d'approbation »",
    qui: "Vous",
    delai: "1 h",
    ou: "agents/_commun/skills/eleves-mineurs/SKILL.md, agents/coordinateur/skills/files-d-approbation/SKILL.md",
    debloque: "Les essais réels des agents",
    verifier: (f) => f.skillsAValider.length === 0,
  },
  {
    code: "cle_api",
    urgence: "maintenant",
    titre:
      "Fournir la clé API (dans l'environnement, jamais dans la conversation) et donner l'accord sur le coût des essais réels (~121 USD)",
    qui: "Vous",
    delai: "30 minutes ; les essais réels prennent ensuite environ une journée",
    ou: "Variable ANTHROPIC_API_KEY du serveur ; condition 5",
    debloque: "Les essais réels des agents, puis la décision de démarrer",
    verifier: condition(5),
  },
  {
    code: "github",
    urgence: "maintenant",
    titre:
      "Faire les réglages de sécurité de GitHub (signalement privé, Dependabot, protection de main, email privée), puis demander la fusion de la branche de travail dans main",
    qui: "Vous",
    delai: "15 minutes",
    ou: "docs/securite/reglages-github.md, puis `pnpm verifier:depot`",
    debloque: "La sécurité du dépôt public ; SECURITY.md, Dependabot et CodeQL actifs sur main",
  },
  {
    code: "hebergement",
    urgence: "avant_deploiement",
    titre:
      "Choisir et déployer l'hébergement (2 processus par serveur), Supabase, sauvegardes chiffrées avec age (paire de clés générée sur votre ordinateur, clé privée hors du serveur) et restauration essayée ; SEL_OPPOSITION fixé une fois pour toutes ; base réglée sur le fuseau du pays ; déployer un paquet dont le contrôle complet a réussi",
    qui: "Vous, avec Claude Code pour les commandes",
    delai: "1 à 2 jours",
    ou: "Guide de mise en route (E1, E2) ; dossier de production ; `pnpm controler`, `pnpm paquet --pays`, `pnpm base:fuseau` ; condition 6",
    debloque: "Le site réel",
    verifier: condition(6),
  },
  {
    code: "messages",
    urgence: "avant_deploiement",
    titre: "Brancher les SMS ou emails réels et approuver les modèles de messages",
    qui: "Vous",
    delai: "Une demi-journée, plus le délai d'ouverture du compte chez le fournisseur",
    ou: "Dossier de production ; condition 7",
    debloque: "Les codes de connexion, les messages aux parents",
    verifier: condition(7),
  },
  {
    code: "veille",
    urgence: "avant_deploiement",
    titre: "Nommer l'équipe de veille et tester l'alerte de détresse sur un vrai téléphone",
    qui: "Vous, avec l'équipe de veille",
    delai: "1 h",
    ou: "Procédure de détresse ; conditions 8 et 9",
    debloque: "La sécurité des élèves pendant le pilote",
    verifier: (f) => f.conditions[8] === "remplie" && f.conditions[9] === "remplie",
  },
  {
    code: "seuils",
    urgence: "avant_deploiement",
    titre: "Valider les seuils du suivi et fixer le budget des agents par semaine",
    qui: "Vous",
    delai: "30 minutes",
    ou: "Section « pilote » de pays.yaml ; « Critères de suspension »",
    debloque: "La surveillance de tous les critères de suspension ; la condition 11",
    verifier: (f) => f.seuilsComplets && f.conditions[11] === "remplie",
  },
  {
    code: "valeurs",
    urgence: "avant_deploiement",
    titre:
      "Valider les valeurs provisoires du pack (FAQ, délais, fiches des agents, durées), avec le référent et le juriste",
    qui: "Vous, avec le référent et le juriste",
    delai: "2 h ; `pnpm pack:verifier` liste ce qui reste",
    ou: "referentiels/<pays>/ et SOURCES.md ; condition 10",
    debloque: "La décision de démarrer",
    verifier: condition(10),
  },
  {
    code: "etablissement",
    urgence: "avant_demarrage",
    titre: "Obtenir l'accord écrit de l'établissement",
    qui: "Vous, avec la direction de l'établissement",
    delai: "Une rencontre ; puis le délai de signature",
    ou: "Condition 2 dans « Conditions du pilote »",
    debloque: "La classe pilote et la décision de démarrer",
    verifier: condition(2),
  },
  {
    code: "dates",
    urgence: "avant_demarrage",
    titre: "Fixer avec l'établissement les dates du pilote et le format du rapport de fin",
    qui: "Vous, avec l'établissement",
    delai: "30 minutes",
    ou: "« Rapport de fin de pilote » (période)",
    debloque: "Le tableau de bord, le rapport de fin, la clôture",
    verifier: (f) => f.periodeSaisie,
  },
  {
    code: "chapitres",
    urgence: "avant_demarrage",
    titre: "Désigner les chapitres du pilote",
    qui: "Vous, avec le référent",
    delai: "15 minutes",
    ou: "« Chapitres du pilote »",
    debloque: "L'espace du référent (pilote en tête), les critères de suspension",
    verifier: (f) => f.chapitresPilote > 0,
  },
  {
    code: "contenus",
    urgence: "avant_demarrage",
    titre: "Faire valider 3 à 5 chapitres du pilote par le référent (chapitre, script, quiz)",
    qui: "Le référent",
    delai: "Environ 2 h par chapitre",
    ou: "Espace du référent ; condition 4",
    debloque: "La décision de démarrer",
    verifier: condition(4),
  },
  {
    code: "classe",
    urgence: "avant_demarrage",
    titre:
      "Créer la classe pilote et inviter son enseignant (après la réponse du juriste à Q19), avec l'effectif annoncé comme capacité",
    qui: "Vous",
    delai: "15 minutes",
    ou: "« Classes du pilote »",
    debloque: "La vue d'ensemble de l'enseignant ; la condition 2",
    verifier: (f) => f.classes > 0,
  },
  {
    code: "documents_pilote",
    urgence: "avant_demarrage",
    titre:
      "Compléter les documents du pilote : « Qui appeler » dans l'aide-mémoire du référent, l'adresse du site sur la fiche élève ; relire la liste du jour J avec l'établissement",
    qui: "Vous, avec l'établissement",
    delai: "1 h",
    ou: "docs/pilote/kit-referent/, docs/pilote/fiche-eleve.md, docs/pilote/journee-ouverture.md",
    debloque: "Une journée d'ouverture sans surprise",
  },
  {
    code: "questionnaire",
    urgence: "avant_demarrage",
    titre: "Valider le questionnaire anonyme (élèves et parents)",
    qui: "Vous",
    delai: "20 minutes",
    ou: "questionnaire.yaml du pack (statut « valide »)",
    debloque: "Le questionnaire dans la plateforme et ses résultats aux rapports",
    verifier: (f) => f.questionnaireValide === true,
  },
  {
    code: "repetition",
    urgence: "avant_demarrage",
    titre:
      "Refaire la répétition sur le site déployé ; `pnpm verifier:site https://<adresse>` doit finir par « Site conforme »",
    qui: "Vous, avec Claude Code",
    delai: "Une demi-journée",
    ou: "docs/pilote/repetition.md ; condition 12",
    debloque: "La décision de démarrer",
    verifier: condition(12),
  },
  {
    code: "suivi",
    urgence: "pendant",
    titre:
      "Chaque semaine : « Critères de suspension », « Semaine du pilote », puis le point au journal",
    qui: "Vous",
    delai: "30 minutes par semaine",
    ou: "Tableau de bord du pilote",
    debloque: "Le suivi du pilote",
  },
  {
    code: "fin",
    urgence: "pendant",
    titre:
      "À la fin : « Clôture du pilote » jusqu'à 8 / 8, puis « Sort des données » avec le juriste",
    qui: "Vous, avec le juriste",
    delai: "Une demi-journée",
    ou: "Tableau de bord du pilote",
    debloque: "La fin propre du pilote",
  },
  {
    code: "avatar",
    urgence: "facultatif",
    titre: "Choisir un fournisseur d'avatar (sinon, le pilote s'appuie sur les leçons écrites)",
    qui: "Vous",
    delai: "Quelques heures de comparaison ; accord sur le tarif",
    ou: "Dossier de production §3 bis",
    debloque: "Les vidéos des professeurs avatars",
  },
  {
    code: "surveillance",
    urgence: "facultatif",
    titre: "Choisir un service de surveillance des erreurs",
    qui: "Vous",
    delai: "1 h",
    ou: "Dossier de production (journal d'erreurs)",
    debloque: "Les alertes d'erreur hors du serveur",
  },
  {
    code: "lecteur_ecran",
    urgence: "facultatif",
    titre: "Essayer la plateforme avec un lecteur d'écran sur un téléphone d'entrée de gamme",
    qui: "Vous, avec l'établissement",
    delai: "1 h, pendant le pilote",
    ou: "Avec l'établissement, pendant le pilote",
    debloque: "L'accessibilité vérifiée en conditions réelles",
  },
  {
    code: "heures_journal",
    urgence: "facultatif",
    titre:
      "Décider si les heures du journal de l'administration s'affichent à l'heure du pays (aujourd'hui en UTC ; les dates sont justes)",
    qui: "Vous",
    delai: "Une réponse",
    ou: "Bilan du Jalon 22, § 6",
    debloque: "Des heures lisibles sans calcul",
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
