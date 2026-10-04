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

/** Réponse scriptée selon des mots-clés du dernier message de l'élève. */
export function reponseSimulee(parametres: BetaMessageStreamParams): BetaMessage {
  const messages = parametres.messages;
  if (parametres.output_config?.format) return scriptSimule(dernierTexteEleve(messages));
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
