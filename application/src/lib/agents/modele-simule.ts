// Modèle simulé pour le développement et les tests automatiques : aucune intelligence, seulement des
// réponses scriptées qui exercent la boucle (texte, appels d'outils, refus). Ne sert jamais aux élèves.
import type {
  BetaContentBlock,
  BetaMessage,
  BetaMessageParam,
  BetaMessageStreamParams,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";
import type { Modele } from "./modele.ts";

function dernierTexteEleve(messages: BetaMessageParam[]): string {
  const dernier = messages[messages.length - 1];
  if (!dernier || dernier.role !== "user") return "";
  if (typeof dernier.content === "string") return dernier.content;
  return dernier.content.map((b) => (b.type === "text" ? b.text : "")).join(" ");
}

function dernierBlocEstResultatOutil(messages: BetaMessageParam[]): boolean {
  const dernier = messages[messages.length - 1];
  return Array.isArray(dernier?.content) && dernier.content.some((b) => b.type === "tool_result");
}

function message(contenu: BetaContentBlock[], raison: BetaMessage["stop_reason"]): BetaMessage {
  return {
    id: `msg_simule_${Date.now()}`,
    type: "message",
    role: "assistant",
    model: "simulation",
    content: contenu,
    stop_reason: raison,
    stop_sequence: null,
    usage: { input_tokens: 0, output_tokens: 0 },
  } as unknown as BetaMessage;
}

function texte(t: string): BetaContentBlock {
  return { type: "text", text: t, citations: null } as unknown as BetaContentBlock;
}

function outil(nom: string, entree: Record<string, unknown>): BetaContentBlock {
  return {
    type: "tool_use",
    id: `toolu_simule_${nom}`,
    name: nom,
    input: entree,
  } as unknown as BetaContentBlock;
}

/** Scénariste simulé : script minimal mais conforme au format, ou refus si le chapitre est hors programme. */
function scriptSimule(demande: string): BetaMessage {
  const chapitre = demande.match(/Chapitre demandé : « (.*) »/)?.[1] ?? "";
  const programme = demande.split("Chapitre demandé")[0];
  const duree = Number(demande.match(/Durée cible : (\d+) minutes/)?.[1] ?? 10) * 60;
  const vide = { consignes: [], materiel: [], securite: [] };
  const commun = {
    a_relire_en_priorite: /colonisation|religion|politique/i.test(demande),
    motif_priorite: /colonisation|religion|politique/i.test(demande) ? "Sujet sensible." : "",
    idees_questions_controle: [],
    glossaire: [],
    exemples_locaux_a_valider: [],
    signalements_programme: [],
  };
  if (!chapitre || !programme.includes(`- ${chapitre}`)) {
    const refus = {
      decision: "refus",
      message_au_referent: "(Scénariste simulé) Ce chapitre n'est pas dans le programme validé.",
      sections: [],
      travaux_pratiques: vide,
      points_a_verifier: [],
      ...commun,
    };
    return message([texte(JSON.stringify(refus))], "end_turn");
  }
  const types = [
    "accroche",
    "objectifs",
    "prerequis",
    "explication",
    "pause",
    "exemple_resolu",
    "erreurs_frequentes",
    "resume",
  ];
  const part = Math.floor(duree / types.length);
  const script = {
    decision: "script",
    message_au_referent: "(Scénariste simulé) Brouillon de démonstration, sans contenu réel.",
    sections: types.map((type, i) => ({
      type,
      titre: `${type} (simulé)`,
      debut_secondes: i * part,
      duree_secondes: i === types.length - 1 ? duree - part * (types.length - 1) : part,
      texte_parle: `Texte simulé pour « ${chapitre} », étape ${type}.${type === "exemple_resolu" ? " Une date [À VÉRIFIER]." : ""}`,
      indications_visuelles: "Titre à l'écran.",
    })),
    travaux_pratiques: { consignes: ["Consigne simulée."], materiel: ["Une règle."], securite: [] },
    points_a_verifier: ["Date citée dans l'exemple résolu (simulation)."],
    ...commun,
  };
  return message([texte(JSON.stringify(script))], "end_turn");
}

/** Évaluateur simulé : trois questions conformes au format, ou refus (hors programme, classement d'élèves). */
function quizSimule(demande: string): BetaMessage {
  const chapitre = demande.match(/Chapitre : « (.*) »/)?.[1] ?? "";
  const programme = demande.split("Chapitre : «")[0];
  const vide = { composante: "", questions: [], questions_signalees: [], points_a_valider: [] };
  if (
    !chapitre ||
    !programme.includes(`- ${chapitre}`) ||
    /classe(r)? les élèves|classement/i.test(demande)
  ) {
    return message(
      [
        texte(
          JSON.stringify({
            decision: "refus",
            message_au_referent: "(Évaluateur simulé) Demande hors de mon périmètre.",
            ...vide,
          }),
        ),
      ],
      "end_turn",
    );
  }
  const lecture = (reponse: string, nature: string) => ({
    reponse,
    ce_que_fait_l_eleve: `Lecture simulée de « ${reponse} ».`,
    nature,
    etape_suivante: nature === "correcte" ? "Continuer le chapitre." : "Revoir le cours (simulé).",
  });
  const commun = {
    notion: "Notion simulée",
    chapitre,
    difficulte: "facile",
    erreurs_deduites: ["Erreur déduite (simulation)."],
    verification: "Vérifiée (simulation).",
  };
  const quiz = {
    decision: "quiz",
    message_au_referent: "(Évaluateur simulé) Quiz de démonstration, sans contenu réel.",
    composante: `Composante simulée de « ${chapitre} »`,
    questions: [
      {
        type: "qcm",
        enonce: "Combien font 2 + 2 ? (simulé)",
        options: ["3", "4", "5"],
        bonne_reponse: 1,
        reponse_attendue: "4",
        explication: "2 + 2 = 4.",
        guide_reponses: [
          lecture("3", "prerequis"),
          lecture("4", "correcte"),
          lecture("5", "confusion_chapitre"),
        ],
        ...commun,
      },
      {
        type: "vrai_faux",
        enonce: "Un carré a quatre côtés égaux. (simulé)",
        options: ["Vrai", "Faux"],
        bonne_reponse: 0,
        reponse_attendue: "Vrai",
        explication: "C'est la définition du carré.",
        guide_reponses: [lecture("Vrai", "correcte"), lecture("Faux", "prerequis")],
        ...commun,
      },
      {
        type: "reponse_courte",
        enonce: "Écris le résultat de 3 × 4. (simulé)",
        options: [],
        bonne_reponse: -1,
        reponse_attendue: "12",
        explication: "3 × 4 = 12.",
        guide_reponses: [],
        ...commun,
      },
    ],
    questions_signalees: /ambigu/i.test(demande)
      ? [{ numero: 1, motif: "Question ambiguë (simulé)." }]
      : [],
    points_a_valider: ["Erreurs déduites à confirmer (simulation)."],
  };
  return message([texte(JSON.stringify(quiz))], "end_turn");
}

/** Tuteur simulé : les trois premiers candidats, rythme tenable, signalements selon des mots-clés. */
function planSimule(demande: string): BetaMessage {
  const candidats = (demande.match(/^\d+\. « /gm) ?? []).length;
  const messageEleve = demande.match(/<message_eleve>\n([\s\S]*?)\n<\/message_eleve>/)?.[1] ?? "";
  const jours = Number(demande.match(/Jours sans activité : (\d+)/)?.[1] ?? 0);
  const minutes = Number(demande.match(/Temps disponible par jour : (\d+)/)?.[1] ?? 30);
  const detresse = /disparaître|n'en peux plus|me fait du mal/i.test(messageEleve);
  const plan = {
    priorites: Array.from({ length: Math.min(3, candidats) }, (_, i) => ({
      candidat: i,
      raison: "Raison simulée.",
      minutes: Math.max(5, Math.min(20, minutes)),
    })),
    message_eleve: /garanti/i.test(messageEleve)
      ? "(Tuteur simulé) Je ne peux rien promettre : ce qui dépend de toi, c'est un travail régulier."
      : /trouble/i.test(messageEleve)
        ? "(Tuteur simulé) Je ne peux pas poser de diagnostic : parles-en à un adulte de confiance."
        : "(Tuteur simulé) Tu as progressé : continuons pas à pas.",
    conseil_rythme: /heures|nuit/i.test(messageEleve)
      ? "Pas plus de deux heures par jour, et dors suffisamment : c'est plus efficace."
      : "Des séances courtes avec des pauses.",
    signalement: detresse ? "detresse" : jours >= 14 ? "decrochage" : "aucun",
    motif_signalement: detresse
      ? "Détresse exprimée (simulé)."
      : jours >= 14
        ? `Inactif depuis ${jours} jours (simulé).`
        : "",
  };
  return message([texte(JSON.stringify(plan))], "end_turn");
}

/** Correction simulée d'une réponse courte. */
function correctionSimulee(demande: string): BetaMessage {
  const attendue = demande.match(/Réponse attendue : (.*)/)?.[1]?.trim() ?? "";
  const reponse =
    demande.match(/<reponse_eleve>\n([\s\S]*?)\n<\/reponse_eleve>/)?.[1]?.trim() ?? "";
  const contestations = (demande.match(/<message_eleve>/g) ?? []).length;
  const detresse = /disparaître|n'en peux plus/i.test(demande);
  const nonTente = !reponse || /corrigé|réponse avant/i.test(reponse);
  const juste =
    !nonTente &&
    attendue !== "" &&
    reponse.replace(/\s/g, "").includes(attendue.replace(/\s/g, ""));
  const correction = {
    resultat: nonTente ? "non_tente" : juste ? "juste" : "faux",
    ce_qui_est_juste: juste ? "Ta réponse est juste (simulé)." : "",
    erreur: juste || nonTente ? "" : "Le résultat ne correspond pas (simulé).",
    notion_a_revoir: juste ? "" : "Notion simulée",
    conseil: nonTente
      ? "Essaie d'abord, même une tentative incomplète m'aide."
      : "Revois l'exemple du cours.",
    message_a_l_eleve:
      contestations > 0 ? "J'ai réexaminé ta réponse (simulé). Ton score ne change pas ici." : "",
    signalement: detresse ? "detresse" : contestations >= 2 ? "erreur_possible_du_quiz" : "aucun",
    motif_signalement: detresse
      ? "Détresse exprimée (simulé)."
      : contestations >= 2
        ? "Contestée deux fois."
        : "",
  };
  return message([texte(JSON.stringify(correction))], "end_turn");
}

/** Réponse scriptée selon des mots-clés du dernier message de l'élève. */
export function reponseSimulee(parametres: BetaMessageStreamParams): BetaMessage {
  const messages = parametres.messages;
  const format = parametres.output_config?.format as
    { schema?: { properties?: Record<string, unknown> } } | undefined;
  if (format) {
    const champs = format.schema?.properties ?? {};
    const demande = dernierTexteEleve(messages);
    if ("questions" in champs) return quizSimule(demande);
    if ("priorites" in champs) return planSimule(demande);
    if ("resultat" in champs) return correctionSimulee(demande);
    return scriptSimule(demande);
  }
  if (dernierBlocEstResultatOutil(messages)) {
    return message([texte("C'est noté. Continuons ensemble.")], "end_turn");
  }
  const question = dernierTexteEleve(messages).toLowerCase();
  if (question.includes("triste") || question.includes("peur")) {
    return message(
      [
        texte(
          "Je suis désolé que tu te sentes ainsi. Parles-en à un adulte de confiance ; je préviens aussi une personne de l'équipe.",
        ),
        outil("signaler", {
          motif: "detresse",
          resume: "L'élève exprime de la tristesse (message simulé).",
        }),
      ],
      "tool_use",
    );
  }
  if (question.includes("j'ai fini") || question.includes("terminé")) {
    return message(
      [texte("Bravo !"), outil("enregistrer_progression", { statut: "termine" })],
      "tool_use",
    );
  }
  if (question.includes("entrée invalide")) {
    return message([outil("enregistrer_progression", { statut: "valide", note: 20 })], "tool_use");
  }
  if (question.includes("réponse")) {
    return message(
      [texte("Je te guide pour la trouver toi-même. Qu'as-tu déjà essayé ?")],
      "end_turn",
    );
  }
  return message(
    [texte("(Professeur simulé) Bonne question. Commençons par un exemple concret.")],
    "end_turn",
  );
}

export const modeleSimule: Modele = (parametres) => {
  const reponse = reponseSimulee(parametres);
  async function* textes() {
    for (const bloc of reponse.content) {
      if (bloc.type === "text") {
        for (const mot of bloc.text.split(/(?<= )/)) yield mot;
      }
    }
  }
  return { textes: textes(), message: Promise.resolve(reponse) };
};
