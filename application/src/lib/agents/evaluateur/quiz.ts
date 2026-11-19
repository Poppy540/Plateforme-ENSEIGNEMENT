// Format des quiz de l'agent Évaluateur (prompt C3, « FORMAT DE SORTIE » ; skill questions-de-controle) :
// imposé au modèle par un schéma JSON, puis vérifié ici. Le statut (« brouillon ») et la version viennent de
// la base, jamais du modèle. Les questions à choix sont corrigées sans modèle ; les réponses courtes par
// l'Évaluateur (voir correction.ts).

export const TYPES_QUESTION = ["qcm", "vrai_faux", "reponse_courte"] as const;
export type TypeQuestion = (typeof TYPES_QUESTION)[number];
export const DIFFICULTES = ["facile", "moyen", "difficile"] as const;
export const NATURES_REPONSE = ["correcte", "prerequis", "confusion_chapitre"] as const;
export const NOMBRE_QUESTIONS_MAX = 10;

export interface LectureReponse {
  /** Texte de l'option (ou forme de réponse attendue pour une réponse courte). */
  reponse: string;
  ce_que_fait_l_eleve: string;
  nature: (typeof NATURES_REPONSE)[number];
  etape_suivante: string;
}

export interface Question {
  type: TypeQuestion;
  enonce: string;
  /** Options affichées (vide pour une réponse courte ; « Vrai », « Faux » pour un vrai/faux). */
  options: string[];
  /** Indice de la bonne option (-1 pour une réponse courte). */
  bonne_reponse: number;
  /** Réponse attendue, en clair (sert à la correction d'une réponse courte). */
  reponse_attendue: string;
  explication: string;
  notion: string;
  chapitre: string;
  difficulte: (typeof DIFFICULTES)[number];
  guide_reponses: LectureReponse[];
  erreurs_deduites: string[];
  /** Résumé de la double vérification (une seule réponse défendable, distracteurs réalistes). */
  verification: string;
}

export interface SortieQuiz {
  decision: "quiz" | "refus";
  message_au_referent: string;
  composante: string;
  questions: Question[];
  questions_signalees: { numero: number; motif: string }[];
  points_a_valider: string[];
}

const texte = { type: "string" } as const;
const listeTextes = { type: "array", items: texte } as const;
const objet = (properties: Record<string, unknown>) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

export const SCHEMA_QUIZ = objet({
  decision: { type: "string", enum: ["quiz", "refus"] },
  message_au_referent: texte,
  composante: texte,
  questions: {
    type: "array",
    items: objet({
      type: { type: "string", enum: [...TYPES_QUESTION] },
      enonce: texte,
      options: listeTextes,
      bonne_reponse: { type: "integer" },
      reponse_attendue: texte,
      explication: texte,
      notion: texte,
      chapitre: texte,
      difficulte: { type: "string", enum: [...DIFFICULTES] },
      guide_reponses: {
        type: "array",
        items: objet({
          reponse: texte,
          ce_que_fait_l_eleve: texte,
          nature: { type: "string", enum: [...NATURES_REPONSE] },
          etape_suivante: texte,
        }),
      },
      erreurs_deduites: listeTextes,
      verification: texte,
    }),
  },
  questions_signalees: {
    type: "array",
    items: objet({ numero: { type: "integer" }, motif: texte }),
  },
  points_a_valider: listeTextes,
});

const estTexte = (v: unknown): v is string => typeof v === "string";
const estListeTextes = (v: unknown): v is string[] => Array.isArray(v) && v.every(estTexte);

function estQuestion(q: Record<string, unknown>): boolean {
  return (
    !!q &&
    (TYPES_QUESTION as readonly unknown[]).includes(q.type) &&
    estTexte(q.enonce) &&
    estListeTextes(q.options) &&
    Number.isInteger(q.bonne_reponse) &&
    estTexte(q.reponse_attendue) &&
    estTexte(q.explication) &&
    estTexte(q.notion) &&
    estTexte(q.chapitre) &&
    (DIFFICULTES as readonly unknown[]).includes(q.difficulte) &&
    Array.isArray(q.guide_reponses) &&
    q.guide_reponses.every(
      (g: Record<string, unknown>) =>
        g &&
        estTexte(g.reponse) &&
        estTexte(g.ce_que_fait_l_eleve) &&
        (NATURES_REPONSE as readonly unknown[]).includes(g.nature) &&
        estTexte(g.etape_suivante),
    ) &&
    estListeTextes(q.erreurs_deduites) &&
    estTexte(q.verification)
  );
}

/** Relit la sortie du modèle ; null si elle ne respecte pas le format. */
export function lireQuiz(brut: string): SortieQuiz | null {
  let v: Record<string, unknown>;
  try {
    v = JSON.parse(brut);
  } catch {
    return null;
  }
  const ok =
    !!v &&
    (v.decision === "quiz" || v.decision === "refus") &&
    estTexte(v.message_au_referent) &&
    estTexte(v.composante) &&
    Array.isArray(v.questions) &&
    v.questions.every(estQuestion) &&
    Array.isArray(v.questions_signalees) &&
    v.questions_signalees.every(
      (s: Record<string, unknown>) => s && Number.isInteger(s.numero) && estTexte(s.motif),
    ) &&
    estListeTextes(v.points_a_valider);
  return ok ? (v as unknown as SortieQuiz) : null;
}

/**
 * Contrôles mécaniques d'un quiz (scénario EV-01) : nombre de questions, une seule bonne réponse désignée
 * et valide, options distinctes, un guide de lecture par option, explication et notion présentes.
 * Renvoie les problèmes (vide = conforme). Un quiz non conforme n'est pas enregistré.
 */
export function controlerQuiz(q: SortieQuiz): string[] {
  if (q.decision !== "quiz") return [];
  const problemes: string[] = [];
  if (q.questions.length === 0 || q.questions.length > NOMBRE_QUESTIONS_MAX)
    problemes.push(`entre 1 et ${NOMBRE_QUESTIONS_MAX} questions`);
  q.questions.forEach((x, i) => {
    const n = `question ${i + 1}`;
    if (!x.enonce.trim() || !x.explication.trim() || !x.notion.trim())
      problemes.push(`${n} : énoncé, explication ou notion manquant`);
    if (x.type === "reponse_courte") {
      if (x.options.length > 0 || x.bonne_reponse !== -1 || !x.reponse_attendue.trim())
        problemes.push(`${n} : réponse courte mal formée`);
      return;
    }
    const attendu = x.type === "vrai_faux" ? [2, 2] : [3, 6];
    if (x.options.length < attendu[0] || x.options.length > attendu[1])
      problemes.push(`${n} : nombre d'options incorrect`);
    if (x.bonne_reponse < 0 || x.bonne_reponse >= x.options.length)
      problemes.push(`${n} : bonne réponse hors des options`);
    const normalisees = x.options.map((o) => o.trim().toLowerCase());
    if (new Set(normalisees).size !== normalisees.length)
      problemes.push(`${n} : options en double`);
    if (x.guide_reponses.length !== x.options.length)
      problemes.push(`${n} : une lecture par option attendue`);
    const correctes = x.guide_reponses.filter((g) => g.nature === "correcte").length;
    if (x.guide_reponses.length === x.options.length && correctes !== 1)
      problemes.push(`${n} : exactement une lecture « correcte » attendue`);
  });
  for (const s of q.questions_signalees) {
    if (s.numero < 1 || s.numero > q.questions.length)
      problemes.push(`question signalée inexistante (${s.numero})`);
  }
  return problemes;
}

/** Ce que voit l'élève avant de répondre : jamais la bonne réponse ni l'explication. */
export interface QuestionEleve {
  type: TypeQuestion;
  enonce: string;
  options: string[];
}

export function questionsPourEleve(questions: Question[]): QuestionEleve[] {
  return questions.map(({ type, enonce, options }) => ({ type, enonce, options }));
}

/** Version lisible (relecture humaine, transcription des tests). */
export function quizEnTexte(q: SortieQuiz): string {
  const lignes = [`Décision : ${q.decision}`];
  if (q.message_au_referent) lignes.push(`Message au référent : ${q.message_au_referent}`);
  if (q.composante) lignes.push(`Composante visée : ${q.composante}`);
  q.questions.forEach((x, i) => {
    lignes.push(
      "",
      `${i + 1}. [${x.type}, ${x.difficulte}] ${x.enonce}`,
      ...x.options.map((o, j) => `   ${j === x.bonne_reponse ? "✔" : "-"} ${o}`),
      `   Réponse attendue : ${x.reponse_attendue}`,
      `   Explication : ${x.explication}`,
      `   Notion : ${x.notion} · chapitre : ${x.chapitre}`,
      ...x.guide_reponses.map(
        (g) =>
          `   « ${g.reponse} » → ${g.nature} : ${g.ce_que_fait_l_eleve} ; ensuite : ${g.etape_suivante}`,
      ),
      ...x.erreurs_deduites.map((e) => `   Erreur déduite : ${e}`),
      `   Vérification : ${x.verification}`,
    );
  });
  if (q.questions_signalees.length > 0)
    lignes.push(
      "",
      "Questions signalées :",
      ...q.questions_signalees.map((s) => `- n° ${s.numero} : ${s.motif}`),
    );
  if (q.points_a_valider.length > 0)
    lignes.push("", "Points à valider :", ...q.points_a_valider.map((p) => `- ${p}`));
  return lignes.join("\n");
}
