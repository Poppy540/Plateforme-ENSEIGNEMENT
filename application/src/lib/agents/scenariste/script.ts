// Format de sortie de l'agent Scénariste (prompt C1, « FORMAT DE SORTIE ») : imposé au modèle par un
// schéma JSON, puis vérifié ici. Les métadonnées (unité, chapitre, version, statut) ne viennent jamais du
// modèle : elles sont ajoutées par le serveur et la base (statut « brouillon » imposé).

/** Les huit étapes de la méthode du prompt, dans l'ordre. */
export const TYPES_SECTION = [
  "accroche",
  "objectifs",
  "prerequis",
  "explication",
  "pause",
  "exemple_resolu",
  "erreurs_frequentes",
  "resume",
] as const;
export type TypeSection = (typeof TYPES_SECTION)[number];

export interface Section {
  type: TypeSection;
  titre: string;
  debut_secondes: number;
  duree_secondes: number;
  texte_parle: string;
  indications_visuelles: string;
}

export interface SortieScenariste {
  decision: "script" | "refus";
  /** Note libre au référent : motif d'un refus, réponse à une question, remarque. */
  message_au_referent: string;
  a_relire_en_priorite: boolean;
  motif_priorite: string;
  sections: Section[];
  travaux_pratiques: { consignes: string[]; materiel: string[]; securite: string[] };
  idees_questions_controle: string[];
  glossaire: { terme: string; definition: string }[];
  points_a_verifier: string[];
  exemples_locaux_a_valider: string[];
  signalements_programme: string[];
}

const texte = { type: "string" } as const;
const listeTextes = { type: "array", items: texte } as const;

/** Schéma imposé au modèle (sorties structurées : chaque objet fermé, aucun champ facultatif). */
export const SCHEMA_SORTIE = {
  type: "object",
  properties: {
    decision: { type: "string", enum: ["script", "refus"] },
    message_au_referent: texte,
    a_relire_en_priorite: { type: "boolean" },
    motif_priorite: texte,
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: [...TYPES_SECTION] },
          titre: texte,
          debut_secondes: { type: "integer" },
          duree_secondes: { type: "integer" },
          texte_parle: texte,
          indications_visuelles: texte,
        },
        required: [
          "type",
          "titre",
          "debut_secondes",
          "duree_secondes",
          "texte_parle",
          "indications_visuelles",
        ],
        additionalProperties: false,
      },
    },
    travaux_pratiques: {
      type: "object",
      properties: { consignes: listeTextes, materiel: listeTextes, securite: listeTextes },
      required: ["consignes", "materiel", "securite"],
      additionalProperties: false,
    },
    idees_questions_controle: listeTextes,
    glossaire: {
      type: "array",
      items: {
        type: "object",
        properties: { terme: texte, definition: texte },
        required: ["terme", "definition"],
        additionalProperties: false,
      },
    },
    points_a_verifier: listeTextes,
    exemples_locaux_a_valider: listeTextes,
    signalements_programme: listeTextes,
  },
  required: [
    "decision",
    "message_au_referent",
    "a_relire_en_priorite",
    "motif_priorite",
    "sections",
    "travaux_pratiques",
    "idees_questions_controle",
    "glossaire",
    "points_a_verifier",
    "exemples_locaux_a_valider",
    "signalements_programme",
  ],
  additionalProperties: false,
};

const estTexte = (v: unknown): v is string => typeof v === "string";
const estListeTextes = (v: unknown): v is string[] => Array.isArray(v) && v.every(estTexte);
const estEntier = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;

/** Relit la sortie du modèle ; null si elle ne respecte pas le format (même tronquée ou altérée). */
export function lireSortie(brut: string): SortieScenariste | null {
  let v: Record<string, unknown>;
  try {
    v = JSON.parse(brut);
  } catch {
    return null;
  }
  if (!v || typeof v !== "object") return null;
  const tp = v.travaux_pratiques as Record<string, unknown> | undefined;
  const ok =
    (v.decision === "script" || v.decision === "refus") &&
    estTexte(v.message_au_referent) &&
    typeof v.a_relire_en_priorite === "boolean" &&
    estTexte(v.motif_priorite) &&
    Array.isArray(v.sections) &&
    v.sections.every(
      (s: Record<string, unknown>) =>
        s &&
        (TYPES_SECTION as readonly unknown[]).includes(s.type) &&
        estTexte(s.titre) &&
        estEntier(s.debut_secondes) &&
        estEntier(s.duree_secondes) &&
        estTexte(s.texte_parle) &&
        estTexte(s.indications_visuelles),
    ) &&
    !!tp &&
    estListeTextes(tp.consignes) &&
    estListeTextes(tp.materiel) &&
    estListeTextes(tp.securite) &&
    estListeTextes(v.idees_questions_controle) &&
    Array.isArray(v.glossaire) &&
    v.glossaire.every(
      (g: Record<string, unknown>) => g && estTexte(g.terme) && estTexte(g.definition),
    ) &&
    estListeTextes(v.points_a_verifier) &&
    estListeTextes(v.exemples_locaux_a_valider) &&
    estListeTextes(v.signalements_programme);
  return ok ? (v as unknown as SortieScenariste) : null;
}

export function dureeTotaleSecondes(s: SortieScenariste): number {
  return s.sections.reduce((total, section) => total + section.duree_secondes, 0);
}

/**
 * Contrôles de structure d'un script (scénario SC-01) : les huit étapes présentes dans l'ordre,
 * texte parlé non vide, durée totale à ±25 % de la cible. Renvoie les problèmes (vide = conforme).
 */
export function controlerStructure(s: SortieScenariste, dureeCibleMinutes: number): string[] {
  if (s.decision !== "script") return [];
  const problemes: string[] = [];
  const ordre = s.sections.map((x) => TYPES_SECTION.indexOf(x.type));
  for (const type of TYPES_SECTION) {
    if (!s.sections.some((x) => x.type === type)) problemes.push(`étape manquante : ${type}`);
  }
  if (ordre.some((rang, i) => i > 0 && rang < ordre[i - 1]))
    problemes.push("étapes dans le désordre");
  if (s.sections.some((x) => !x.texte_parle.trim())) problemes.push("section sans texte parlé");
  const cible = dureeCibleMinutes * 60;
  const duree = dureeTotaleSecondes(s);
  if (Math.abs(duree - cible) > cible * 0.25)
    problemes.push(
      `durée ${Math.round(duree / 60)} min loin de la cible (${dureeCibleMinutes} min)`,
    );
  return problemes;
}

/** Points [À VÉRIFIER] cités dans le texte mais absents de la liste finale (le prompt exige la liste). */
export function pointsAVerifierNonListes(s: SortieScenariste): number {
  const dansTexte = s.sections.reduce(
    (n, x) => n + (x.texte_parle.match(/\[À VÉRIFIER\]/gi)?.length ?? 0),
    0,
  );
  return Math.max(0, dansTexte - s.points_a_verifier.length);
}

/** Version lisible (relecture humaine, transcription des tests). */
export function scriptEnTexte(s: SortieScenariste): string {
  const mmss = (t: number) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
  const lignes = [`Décision : ${s.decision}`];
  if (s.message_au_referent) lignes.push(`Message au référent : ${s.message_au_referent}`);
  if (s.a_relire_en_priorite) lignes.push(`À RELIRE EN PRIORITÉ : ${s.motif_priorite}`);
  for (const [i, x] of s.sections.entries()) {
    lignes.push(
      "",
      `${i + 1}. [${x.type}] ${x.titre} (${mmss(x.debut_secondes)}, ${x.duree_secondes} s)`,
      `Texte parlé : ${x.texte_parle}`,
      `À l'écran : ${x.indications_visuelles}`,
    );
  }
  const liste = (titre: string, l: string[]) => {
    if (l.length > 0) lignes.push("", `${titre} :`, ...l.map((e) => `- ${e}`));
  };
  liste("TP — consignes", s.travaux_pratiques.consignes);
  liste("TP — matériel", s.travaux_pratiques.materiel);
  liste("TP — sécurité", s.travaux_pratiques.securite);
  liste("Idées de questions de contrôle", s.idees_questions_controle);
  liste(
    "Glossaire",
    s.glossaire.map((g) => `${g.terme} : ${g.definition}`),
  );
  liste("Points [À VÉRIFIER]", s.points_a_verifier);
  liste("Exemples locaux à valider", s.exemples_locaux_a_valider);
  liste("Signalements sur le programme", s.signalements_programme);
  return lignes.join("\n");
}
