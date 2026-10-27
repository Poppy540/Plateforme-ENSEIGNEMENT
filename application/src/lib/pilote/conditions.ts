// Les 12 conditions préalables au pilote (docs/pilote/README.md ; Jalon 12, étape 4 ; ADR 0078). Elles valent pour
// tout pays : rien ici ne nomme un pays, une classe ou une matière. Trois natures :
//   - automatique : vérifiée en base, jamais cochée à la main (référent, contenus) ;
//   - mixte : une partie vérifiée (configuration du serveur, classe créée) ET une coche du propriétaire avec preuve ;
//   - manuelle : coche du propriétaire avec preuve seulement.
// Fonctions pures : la page et les tests s'appuient dessus. Aucune valeur de configuration n'est lue ici : seulement
// des constats « variable correcte ou non » (src/lib/production/verification.ts).

export type Nature = "automatique" | "mixte" | "manuelle";
export type EtatCondition = "remplie" | "a_faire" | "a_revoir";

export interface DefinitionCondition {
  numero: number;
  titre: string;
  preuveAttendue: string;
  nature: Nature;
  /** Variables de configuration contrôlées (noms seulement), pour les conditions mixtes qui en dépendent. */
  variables?: readonly string[];
}

export interface FaitsPilote {
  chapitres_pilote: number;
  chapitres_prets: number;
  chapitres_avec_video: number;
  familles_pilote: number;
  familles_sans_referent: number;
  classes: number;
  classes_avec_enseignant: number;
}

export interface Coche {
  numero: number;
  preuve: string;
  date_preuve: string;
}

/** Constat de configuration : nom de la variable et verdict, jamais la valeur. */
export interface ConstatVariable {
  point: string;
  ok: boolean;
}

export interface ConditionEvaluee extends DefinitionCondition {
  etat: EtatCondition;
  /** Partie vérifiée par la plateforme (absente pour une condition manuelle). */
  verification: { ok: boolean; detail: string } | null;
  coche: Coche | null;
}

export const CONDITIONS_PILOTE: readonly DefinitionCondition[] = [
  {
    numero: 1,
    titre:
      "Avis écrit d'un juriste du pays (données, mineurs, conservation, IA hors du pays, textes)",
    preuveAttendue: "Avis daté, versé au dossier",
    nature: "manuelle",
  },
  {
    numero: 2,
    titre: "Accord de l'établissement (et de l'autorité académique si le juriste l'exige)",
    preuveAttendue: "Lettre ou convention signée ; classe du pilote créée",
    nature: "mixte",
  },
  {
    numero: 3,
    titre: "Enseignant-référent actif pour chaque matière du pilote",
    preuveAttendue: "Compte référent activé (vérifié par la plateforme)",
    nature: "automatique",
  },
  {
    numero: 4,
    titre: "Premier contenu validé : 3 à 5 chapitres avec script et quiz validés",
    preuveAttendue: "Statuts dans l'espace référent (vérifiés par la plateforme)",
    nature: "automatique",
  },
  {
    numero: 5,
    titre: "Clé API hors du dépôt et passages réels des batteries de tests conformes",
    preuveAttendue: "Rapports de tests datés, relus par le référent",
    nature: "mixte",
    variables: ["MODE_MODELE", "ANTHROPIC_API_KEY"],
  },
  {
    numero: 6,
    titre: "Hébergement choisi et déployé, sauvegardes et test de restauration",
    preuveAttendue: "Adresse du site et date du test de restauration",
    nature: "mixte",
    variables: [
      "ENVIRONNEMENT",
      "URL_PUBLIQUE",
      "SECRET_SESSION",
      "SEL_AUDIT",
      "SEL_OPPOSITION",
      "URL_BASE_DONNEES",
      "MODE_AUTH",
      "URL_SUPABASE",
      "CLE_PUBLIQUE_SUPABASE",
      "CLE_SERVICE_SUPABASE",
      "MODE_FILE",
    ],
  },
  {
    numero: 7,
    titre: "SMS ou email réels pour les codes et les messages aux parents, modèles approuvés",
    preuveAttendue: "Envoi testé sur un numéro de l'équipe",
    nature: "mixte",
    variables: [
      "FOURNISSEUR_SMS",
      "FOURNISSEUR_EMAIL",
      "TWILIO_COMPTE",
      "TWILIO_JETON",
      "SMS_EXPEDITEUR",
      "BREVO_CLE",
      "EMAIL_EXPEDITEUR",
      "MESSAGERIE_HTTP_URL",
      "MESSAGERIE_HTTP_JETON",
    ],
  },
  {
    numero: 8,
    titre: "Alerte de détresse reçue par la veille, avec relances ; exécuteur planifié",
    preuveAttendue: "Test d'alerte reçu sur un vrai téléphone",
    nature: "mixte",
    variables: ["CONTACTS_VEILLE", "JETON_EXECUTEUR", "FOURNISSEUR_SMS"],
  },
  {
    numero: 9,
    titre: "Équipe de veille nommée, contacts d'urgence locaux complétés",
    preuveAttendue: "Tableau de la procédure de détresse rempli",
    nature: "manuelle",
  },
  {
    numero: 10,
    titre: "Valeurs provisoires du pack validées (FAQ, délais, durées, fiches, questionnaire)",
    preuveAttendue: "Statuts mis à jour dans le pack et SOURCES.md",
    nature: "manuelle",
  },
  {
    numero: 11,
    titre: "Budget du pilote approuvé, avec le plafond journalier par agent",
    preuveAttendue: "Accord écrit du propriétaire",
    nature: "mixte",
    variables: ["COUT_JOUR_MAX_AGENT_USD"],
  },
  {
    numero: 12,
    titre: "Suspension effective : agent suspendu, accès des élèves coupé, sessions fermées",
    preuveAttendue: "Répétition refaite sur le site déployé",
    nature: "manuelle",
  },
];

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

function verificationEnBase(numero: number, f: FaitsPilote): { ok: boolean; detail: string } {
  if (numero === 3) {
    if (f.familles_pilote === 0)
      return { ok: false, detail: "Aucun chapitre du pilote désigné : matières inconnues." };
    return {
      ok: f.familles_sans_referent === 0,
      detail:
        f.familles_sans_referent === 0
          ? `Référent actif pour ${pluriel(f.familles_pilote, "matière")} du pilote.`
          : `${pluriel(f.familles_sans_referent, "matière")} du pilote sans référent actif.`,
    };
  }
  if (numero === 4) {
    if (f.chapitres_pilote === 0)
      return { ok: false, detail: "Aucun chapitre du pilote désigné (Chapitres du pilote)." };
    const detail =
      `${f.chapitres_prets} prêt(s) sur ${pluriel(f.chapitres_pilote, "chapitre")} du pilote ` +
      `(chapitre, script et quiz validés) ; ${f.chapitres_avec_video} avec vidéo publiée.`;
    return {
      ok: f.chapitres_pilote >= 3 && f.chapitres_prets === f.chapitres_pilote,
      detail: f.chapitres_pilote < 3 ? `${detail} Il en faut 3 au moins.` : detail,
    };
  }
  // Condition 2 : la classe du pilote existe (l'accord lui-même est coché avec sa preuve).
  return {
    ok: f.classes > 0,
    detail:
      f.classes === 0
        ? "Aucune classe du pilote créée (Classes du pilote)."
        : `${pluriel(f.classes, "classe")} du pilote, dont ${f.classes_avec_enseignant} avec un enseignant activé.`,
  };
}

function verificationConfiguration(
  variables: readonly string[],
  constats: readonly ConstatVariable[],
): { ok: boolean; detail: string } {
  const concernes = constats.filter((c) => variables.includes(c.point));
  const manquants = concernes.filter((c) => !c.ok).map((c) => c.point);
  if (concernes.length === 0) return { ok: false, detail: "Configuration non contrôlée." };
  return manquants.length === 0
    ? { ok: true, detail: "Configuration du serveur correcte." }
    : { ok: false, detail: `À régler sur le serveur : ${manquants.join(", ")}.` };
}

export function evaluerConditions(
  faits: FaitsPilote,
  coches: readonly Coche[],
  constats: readonly ConstatVariable[],
): ConditionEvaluee[] {
  return CONDITIONS_PILOTE.map((d) => {
    const coche =
      d.nature === "automatique" ? null : (coches.find((c) => c.numero === d.numero) ?? null);
    const verification =
      d.nature === "manuelle"
        ? null
        : d.variables
          ? verificationConfiguration(d.variables, constats)
          : verificationEnBase(d.numero, faits);
    let etat: EtatCondition;
    if (d.nature === "automatique") etat = verification?.ok ? "remplie" : "a_faire";
    else if (!coche) etat = "a_faire";
    else if (verification && !verification.ok) etat = "a_revoir";
    else etat = "remplie";
    return { ...d, etat, verification, coche };
  });
}

/** Décompte pour la décision de démarrer (G2) : le pilote ne commence qu'avec toutes les conditions remplies. */
export function decompte(conditions: readonly ConditionEvaluee[]) {
  const remplies = conditions.filter((c) => c.etat === "remplie").length;
  return { remplies, total: conditions.length, pret: remplies === conditions.length };
}
