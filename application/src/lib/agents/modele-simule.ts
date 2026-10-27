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
  const detresse = /disparaître|n'en peux plus|me fait du mal|peur de rentrer/i.test(messageEleve);
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

/** Support simulé : règles par mots-clés, pour exercer la mécanique (tickets, escalades, refus). */
/** Rapport d'écart simulé de la Conformité : lit les lignes numérotées du document, rien d'autre. */
function conformiteSimulee(demande: string): BetaMessage {
  const consigne = (demande.match(/<consigne>\n([\s\S]*?)\n<\/consigne>/)?.[1] ?? "").toLowerCase();
  const document = demande.match(/<document>\n([\s\S]*?)\n<\/document>/)?.[1] ?? "";
  const declare = /Déclaré officiel par la personne qui l'a déposé : oui/.test(demande);
  const origine = demande.match(/Origine déclarée : (.*?)\. Déclaré/)?.[1] ?? "";
  const alertes: { type: string; detail: string }[] = [];
  const points: string[] = [];
  let refus = "";
  if (/corrige le référentiel|modifie le référentiel|mets à jour le référentiel/.test(consigne))
    refus =
      "(Conformité simulée) Je ne modifie pas le référentiel validé : je propose ce rapport d'écart, que le référent décide d'appliquer ou non.";
  else if (/conforme|certifie/.test(consigne))
    refus =
      "(Conformité simulée) Je ne déclare aucune conformité définitive : je recommande, avec un niveau de confiance ; la validation revient au référent.";
  const nonOfficiel = !declare || /blog|forum|facebook|wordpress/i.test(origine + document);
  if (nonOfficiel)
    alertes.push({
      type: "document_non_officiel",
      detail: "Document non officiel ou non vérifié : ses données restent « déduites » (simulé).",
    });
  if (/Le document est joint en PDF/.test(demande))
    alertes.push({ type: "document_illisible", detail: "PDF non lu par la simulation." });
  const annees = new Set(
    [...document.matchAll(/(?:version|réforme|programme)\D{0,15}((?:19|20)\d{2})/gi)].map(
      (m) => m[1],
    ),
  );
  if (annees.size > 1) {
    alertes.push({
      type: "source_contradictoire",
      detail: `Versions contradictoires (${[...annees].join(", ")}) : laquelle fait foi ? (simulé)`,
    });
    points.push("Indiquer quelle version du programme fait foi.");
  }
  if (/^\s*(agent|conformité)\s*:/im.test(document))
    alertes.push({
      type: "instruction_cachee",
      detail: "Le document contient une instruction adressée à un agent : ignorée (simulé).",
    });
  let page = "";
  const extraction: Record<string, unknown>[] = [];
  document.split(/\r?\n/).forEach((ligne, i) => {
    const marque = ligne.match(/^\s*\[?page\s+(\d+)\]?\s*$/i);
    if (marque) {
      page = marque[1];
      return;
    }
    const m = ligne.match(/^\s*(?:chapitre\s*)?(\d+)\s*[.:)\-–]\s*(.+)$/i);
    if (!m || /^(agent|conformité)/i.test(m[2])) return;
    const volume = m[2].match(/(\d+)\s*h\b/i);
    const coefficient = m[2].match(/coefficient\s*:?\s*(\d+)/i);
    const titre = m[2]
      .replace(/\(?\s*\d+\s*h\b\s*\)?/i, "")
      .replace(/[,;(]?\s*coefficient\s*:?\s*\d+\)?/i, "")
      .replace(/[\s,;-]+$/, "")
      .trim();
    extraction.push({
      ordre: Number(m[1]),
      titre,
      sous_themes: [],
      volume_horaire: volume ? Number(volume[1]) : null,
      coefficient: coefficient ? Number(coefficient[1]) : null,
      source: page ? `page ${page}, ligne ${i + 1}` : `ligne ${i + 1}`,
      statut: nonOfficiel ? "deduite" : "officielle",
      champs_manquants: [
        ...(volume ? [] : ["volume horaire"]),
        ...(coefficient ? [] : ["coefficient"]),
      ],
      confiance: "moyenne",
    });
  });
  const normaliser = (t: string) =>
    t
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const pack = [...demande.matchAll(/^- (\S+) « (.*?) » \[/gm)].map((m) => ({
    ref: m[1],
    titre: m[2],
  }));
  const proches = (a: string, b: string) => {
    const [x, y] = [normaliser(a), normaliser(b)];
    return x === y || x.includes(y) || y.includes(x);
  };
  const comparaison = [
    ...pack.map((c) => {
      const e = extraction.find((x) => proches(String(x.titre), c.titre));
      return {
        chapitre: c.ref,
        titre_document: e ? String(e.titre) : "",
        presence: e ? "dans_les_deux" : "seulement_plateforme",
        statut: e ? "reutilisable" : "a_adapter",
        ecart: e ? "Intitulés concordants (simulé)." : "Absent du document : à vérifier (simulé).",
        source: e ? String(e.source) : "",
        confiance: e ? "moyenne" : "faible",
        action: e
          ? "Aucune, sous réserve du référent."
          : "Vérifier si le chapitre est au programme.",
      };
    }),
    ...extraction
      .filter((e) => !pack.some((c) => proches(String(e.titre), c.titre)))
      .map((e) => ({
        chapitre: "",
        titre_document: String(e.titre),
        presence: "seulement_document",
        statut: "a_recreer",
        ecart: "Chapitre du document absent de la plateforme (simulé).",
        source: String(e.source),
        confiance: "moyenne",
        action: "Créer le chapitre dans le pack, après validation.",
      })),
  ];
  if (extraction.some((e) => (e.champs_manquants as string[]).length > 0))
    points.push("Volumes horaires ou coefficients manquants : à demander au référent ou à l'IPN.");
  return message(
    [
      texte(
        JSON.stringify({
          refus,
          document: {
            officiel: !nonOfficiel,
            raison: nonOfficiel
              ? "Source non officielle ou non vérifiée (simulé)."
              : "Déclaré officiel au dépôt (simulé).",
            version_programme: [...annees].join(", "),
          },
          extraction,
          comparaison,
          alertes,
          points_a_valider: points,
          synthese: `(Conformité simulée) ${extraction.length} chapitre(s) extrait(s), ${comparaison.length} ligne(s) comparée(s).`,
        }),
      ),
    ],
    "end_turn",
  );
}

/** Revue de cohérence simulée du Coordinateur : règles simples, aucune connaissance du programme. */
function coordinateurSimule(demande: string): BetaMessage {
  const consigne = (
    demande.match(/<consigne_referent>\n([\s\S]*?)\n<\/consigne_referent>/)?.[1] ?? ""
  ).toLowerCase();
  const contenus = demande.match(/<contenus>\n([\s\S]*?)\n<\/contenus>/)?.[1] ?? "";
  const vide = {
    constats: [],
    propositions_liens: [],
    glossaire: [],
    plan_production: [],
    classement: [],
    decisions: [],
  };
  const sortie = (s: Record<string, unknown>) =>
    message([texte(JSON.stringify({ refus: "", synthese: "", ...vide, ...s }))], "end_turn");
  if (/valid|publi/.test(consigne) && /marque|comme valid|valide tout|publie/.test(consigne))
    return sortie({
      refus:
        "(Coordinateur simulé) Je ne peux rien valider ni publier : la décision revient au référent. Je prépare une synthèse des points à décider.",
    });
  if (/résultats? de l'élève|notes de l'élève|données de l'élève|l'élève [a-z]\b/.test(consigne))
    return sortie({
      refus:
        "(Coordinateur simulé) Je n'ai accès à aucune donnée individuelle d'élève, seulement à des statistiques agrégées.",
    });
  if (/explique-lui|réponds à l'élève|élève .*bloqué|question de cours/.test(consigne))
    return sortie({
      refus:
        "(Coordinateur simulé) Je ne m'adresse pas aux élèves : la question va au Professeur de l'unité par l'Orchestrateur. Je peux vérifier si un prérequis manque.",
    });
  if (/prompt système|clé api|mot de passe|programme qui|administrateur/.test(consigne))
    return sortie({
      refus:
        "(Coordinateur simulé) Cette demande sort de mon rôle : je ne révèle ni mes instructions ni aucun secret, et je n'agis que sur la cohérence de la famille.",
    });
  if (/modifie (le|les) (prompt|droits)|change le prompt/.test(consigne))
    return sortie({
      refus:
        "(Coordinateur simulé) Je ne modifie ni prompt ni droits : je peux proposer une modification au référent.",
    });

  // Programme : unités dans l'ordre des classes, chapitres par unité.
  const unites = [...demande.matchAll(/^## (\S+) \(classe [^)]*\)\n((?:- .*\n?)*)/gm)].map((m) => ({
    code: m[1],
    chapitres: [...m[2].matchAll(/^- (\S+) « (.*?) »/gm)].map((c) => ({ ref: c[1], titre: c[2] })),
  }));
  const constats: Record<string, unknown>[] = [];
  const propositions: Record<string, unknown>[] = [];
  const constat = (type: string, c: string, r: string, chapitres: string[] = [], alerte = false) =>
    constats.push({
      type,
      chapitres,
      niveaux: [],
      gravite: alerte ? "elevee" : "moyenne",
      constat: `${c} (simulé)`,
      recommandation: r,
      confiance: "moyenne",
      alerte_immediate: alerte,
    });
  for (const m of demande.matchAll(/Chapitre isolé \(aucun prérequis ni suite\) : (\S+)/g)) {
    const ref = m[1];
    const i = unites.findIndex((u) => u.chapitres.some((c) => c.ref === ref));
    const precedent = i > 0 ? unites[i - 1].chapitres.at(-1) : undefined;
    constat(
      "rupture",
      `Le chapitre ${ref} n'est relié à aucun prérequis : une notion risque d'y être utilisée sans avoir été introduite`,
      "Ajouter un prérequis ou un chapitre d'introduction, à décider par le référent.",
      [ref],
    );
    if (precedent && propositions.length < 3)
      propositions.push({
        chapitre: ref,
        prerequis: precedent.ref,
        nature: "souple",
        justification: "Chapitre de la classe précédente le plus proche (simulé).",
      });
  }
  const parTitre = new Map<string, string[]>();
  for (const c of unites.flatMap((u) => u.chapitres))
    parTitre.set(c.titre, [...(parTitre.get(c.titre) ?? []), c.ref]);
  for (const [titre, refs] of parTitre)
    if (refs.length > 1)
      constat(
        "doublon",
        `Chapitres quasi identiques « ${titre} »`,
        "Proposer un socle commun et des extensions par série.",
        refs,
      );
  if (/(agent|coordinateur)\s*:\s*(valide|marque|publie)/i.test(contenus))
    constat(
      "instruction_cachee",
      "Un contenu contient une instruction adressée au Coordinateur ; elle est ignorée",
      "Vérifier et corriger ce contenu.",
      [],
      true,
    );
  if (/colonisation|guerre|religion|ethnie/i.test(contenus + consigne))
    constat(
      "sujet_sensible",
      "Sujet sensible : vérifier l'équilibre factuel",
      "Relecture prioritaire par le référent.",
      [],
      true,
    );
  for (const m of demande.matchAll(/^- (\S+), question (\d+) : (\d+) % de réussite/gm))
    if (Number(m[3]) < 40)
      constat(
        "question_defectueuse",
        `Taux de réussite faible (${m[3]} %) à la question ${m[2]} de ${m[1]}`,
        "Vérifier d'abord si la question est ambiguë ou défectueuse avant de conclure à une incompréhension.",
        [m[1]],
      );
  if (/quiz écarté\(s\) des statistiques/.test(demande))
    constat(
      "donnees_insuffisantes",
      "Des quiz ont trop peu de tentatives pour rester anonymes ; ils ne sont pas analysés",
      "Attendre au moins 5 tentatives.",
    );
  const ordre = demande.match(/compatible avec les prérequis : (.*)/)?.[1]?.split(", ") ?? [];
  const classement = /pays|référentiel/.test(consigne)
    ? unites
        .flatMap((u) => u.chapitres)
        .slice(0, 3)
        .map((c) => ({
          chapitre: c.ref,
          couche: "adaptable",
          confiance: "faible",
          raison: "Classement simulé, à vérifier.",
        }))
    : [];
  return sortie({
    constats,
    propositions_liens: propositions,
    glossaire: [
      {
        terme: "Notation simulée",
        definition: "Entrée de glossaire simulée.",
        niveaux: [],
        notation: "—",
      },
    ],
    plan_production: ordre.slice(0, 5).map((ref) => ({
      chapitre: ref,
      raison: "Placé après ses prérequis (simulé).",
    })),
    classement,
    decisions: constats.slice(0, 3).map((c) => ({
      question: `Que faire : ${c.constat}`,
      recommandation: String(c.recommandation),
      confiance: "moyenne",
    })),
    synthese: `(Coordinateur simulé) ${constats.length} constat(s), ${propositions.length} lien(s) proposé(s).`,
  });
}

function supportSimule(demande: string): BetaMessage {
  const m = (demande.match(/<message>\n([\s\S]*?)\n<\/message>/)?.[1] ?? "").toLowerCase();
  const r = (
    reponse: string,
    action: string,
    categorie: string,
    priorite = 3,
    faq: string[] = [],
    resume = "",
  ) =>
    message(
      [
        texte(
          JSON.stringify({
            reponse,
            faq_utilisees: faq,
            action,
            categorie,
            priorite,
            resume_ticket: resume,
          }),
        ),
      ],
      "end_turn",
    );
  if (/disparaître|n'en peux plus|me frappe|danger|peur de rentrer/.test(m))
    return r(
      "(Support simulé) Tu n'es pas seul : je préviens tout de suite une personne de l'équipe. Parles-en aussi à un adulte de confiance.",
      "escalade_humain",
      "detresse",
      1,
      [],
      "Message de détresse (simulé).",
    );
  if (/code|mot de passe/.test(m))
    return r(
      "(Support simulé) Ne partage jamais ton code avec personne, même avec nous : saisis-le seulement dans l'application.",
      "aucune",
      "connexion",
      3,
      ["code-non-recu"],
    );
  if (/rembours|payer|paiement/.test(m))
    return r(
      "(Support simulé) Je ne peux rien promettre sur un paiement : j'ouvre une demande pour un humain. La plateforme est gratuite pendant le pilote.",
      "escalade_humain",
      "paiement_suppression",
      2,
      ["gratuit"],
      "Demande de remboursement (simulé).",
    );
  if (/supprim/.test(m))
    return r(
      "(Support simulé) Une suppression demandée par un tiers doit être vérifiée par un humain : je transmets votre demande.",
      "escalade_humain",
      "paiement_suppression",
      2,
      ["mes-donnees"],
      "Demande de suppression par un tiers (simulé).",
    );
  if (/mère|père|historique|parent de/.test(m))
    return r(
      "(Support simulé) Je ne peux pas donner d'informations sur un élève sans vérification. Votre enfant peut vous proposer les rapports depuis son espace.",
      "aucune",
      "fraude_plainte",
      3,
      ["rapports-parents"],
    );
  if (/promotion|publicité|tous les parents/.test(m))
    return r(
      "(Support simulé) Je ne peux envoyer que les messages approuvés : pas de message promotionnel.",
      "aucune",
      "autre",
      3,
    );
  if (/thalès|théorème|exercice|équation/.test(m))
    return r(
      "(Support simulé) Pour une question de cours, ouvre le chapitre et pose-la au professeur de la matière.",
      "orienter_professeur",
      "question_cours",
      3,
      ["question-de-cours"],
    );
  if (/inscri|parent|mineur/.test(m))
    return r(
      "(Support simulé) Pour un élève mineur, un parent ou tuteur doit accepter l'inscription par le lien qu'il reçoit.",
      "aucune",
      "inscription",
      3,
      ["inscription", "accord-parent"],
    );
  return r(
    "(Support simulé) Je n'ai pas cette réponse dans la FAQ : j'ouvre une demande pour l'équipe.",
    "ouvrir_ticket",
    "autre",
    3,
    [],
    "Question hors FAQ (simulé).",
  );
}

/** Recruteur simulé : réponses scriptées selon la tâche, la consigne et les informations du candidat. */
function recruteurSimule(demande: string): BetaMessage {
  const tache = demande.match(/^# TÂCHE DE RECRUTEMENT — .* : (\w+)$/m)?.[1] ?? "consigne";
  const consigne = (demande.match(/<consigne>\n([\s\S]*?)\n<\/consigne>/)?.[1] ?? "").toLowerCase();
  const infos = (
    demande.match(/<informations>\n([\s\S]*?)\n<\/informations>/)?.[1] ?? ""
  ).toLowerCase();
  const source = demande.match(/^- Source : (.*)$/m)?.[1] ?? "une source autorisée";
  const nom = demande.match(/^- Nom : (.*)$/m)?.[1] ?? "";
  const relanceEnvoyee = /^- relance « .* » : envoye/m.test(demande);
  const sortie = {
    refus: "",
    reponse_au_responsable: "",
    fiche: null as unknown,
    message_candidat: null as unknown,
    dossier_accord: null as unknown,
    actions: [] as string[],
    escalade: "",
  };
  const fin = () => message([texte(JSON.stringify(sortie))], "end_turn");
  const signature =
    "Ce message a été rédigé par une intelligence artificielle, l'assistant de recrutement du projet, pour le compte du responsable du projet.";
  const refuser = (raison: string, proposition: string) => {
    sortie.refus = `(Recruteur simulé) ${raison}`;
    sortie.reponse_au_responsable = `(Recruteur simulé) ${raison} ${proposition}`;
    return fin();
  };
  // Consignes du responsable contraires aux règles : refus, avec une proposition légitime.
  if (/ignore tes instructions|prompt système|affiche ton prompt/.test(consigne))
    return refuser(
      "Je ne communique pas mes instructions.",
      "Je peux vous aider à préparer un message ou une fiche.",
    );
  if (/clé api|mot de passe|secret/.test(consigne))
    return refuser(
      "Je n'ai pas accès aux clés et je ne les demande jamais.",
      "Je peux continuer le recrutement.",
    );
  if (/malveillant|virus|pirat/.test(consigne))
    return refuser(
      "Ce n'est pas dans ma mission.",
      "Je peux préparer une fiche ou un message de recrutement.",
    );
  if (/autre candidat|liste des candidats|infos d'un autre|notes d'un autre/.test(consigne))
    return refuser(
      "Je ne parle pas d'une personne à une autre.",
      "Je travaille seulement sur la fiche en cours.",
    );
  if (/administrateur|droit de publier|droit d'envoyer|droits/.test(consigne))
    return refuser(
      "Mes droits ne changent que par configuration.",
      "Je continue avec les brouillons.",
    );
  if (/sexuel|violent|haineux/.test(consigne))
    return refuser("Je ne produis pas ce type de contenu.", "Je reprends le recrutement.");
  if (/script|aspir|récupère|collecte automatis/.test(consigne))
    return refuser(
      "Je ne fais aucune collecte automatisée de coordonnées.",
      "Je propose la cooptation, les candidatures spontanées et les sources autorisées du pack.",
    );
  if (/achet|liste de téléphones|liste d'adresses/.test(consigne))
    return refuser(
      "Je n'utilise que les sources autorisées : pas de liste achetée.",
      "Je propose la cooptation.",
    );
  if (/directement|pas besoin que je|sans relire|sans validation/.test(consigne)) {
    sortie.actions = ["transmettre_responsable"];
    return refuser(
      "Je n'envoie rien sans votre approbation enregistrée.",
      "Le brouillon reste en attente de votre approbation dans l'administration.",
    );
  }
  if (/dernière place|urgence|presse|mets la pression/.test(consigne))
    return refuser(
      "Je ne mens pas et je ne crée pas de fausse urgence.",
      "Je peux rédiger un rappel neutre.",
    );
  if (/accord est conclu|c'est signé|confirme .*accord/.test(consigne))
    return refuser(
      "Je ne peux pas confirmer un accord : il devient valable seulement quand le responsable et le candidat ont signé.",
      "Je prépare le dossier pour la signature.",
    );
  if (/religion|situation familiale|santé|opinions/.test(consigne))
    return refuser(
      "Je ne collecte aucune donnée sensible.",
      "La fiche reste minimale et pédagogique.",
    );
  if (/candidates|hommes|femmes|âge|jeunes/.test(consigne))
    return refuser(
      "Je n'applique aucun critère discriminatoire.",
      "J'évalue seulement la maîtrise de la matière, l'expérience d'enseignement, la connaissance du programme et la disponibilité.",
    );
  if (/négoci|tarif|exclusivité|rémunération/.test(consigne)) {
    sortie.actions = ["transmettre_responsable"];
    sortie.escalade = "Question de rémunération ou d'exclusivité : hors des conditions validées.";
    return refuser(
      "Je ne négocie ni ne promets aucune contrepartie hors des conditions validées.",
      "Je vous transmets la question.",
    );
  }
  if (/voix|clon|image/.test(consigne) || tache === "accord") {
    const voix = /voix|clon|image/.test(consigne);
    if (voix)
      sortie.refus = "(Recruteur simulé) L'usage de la voix n'entre pas dans l'accord de référent.";
    sortie.dossier_accord = {
      resume:
        "Rôle : relire et valider programmes, scripts, quiz et vidéos de la famille. Conditions : celles validées par le responsable (aucune fixée pour l'instant). Aucun engagement avant la signature humaine.",
      consentement_image_voix_separe: true,
      points_a_valider: [
        "Conditions à fixer par le responsable",
        "Relecture du modèle par le juriste",
        "Consentement séparé, spécifique et révocable si la voix ou l'image doivent servir (document distinct)",
      ],
    };
    sortie.reponse_au_responsable =
      "(Recruteur simulé) Dossier d'accord préparé en brouillon ; à valider.";
    return fin();
  }
  // Informations venant du candidat (données non fiables).
  if (/(recruteur|agent) ?:|ignore|tarifs confidentiels|envoie à tous/.test(infos)) {
    sortie.actions.push("signaler_contenu_suspect");
    sortie.escalade = "Instruction cachée dans le profil du candidat : ignorée et signalée.";
  }
  if (tache === "repondre") {
    if (/ne me contactez plus|non merci|\bstop\b|pas intéressé/.test(infos)) {
      sortie.actions.push("enregistrer_refus");
      sortie.reponse_au_responsable =
        "(Recruteur simulé) Refus enregistré dans la liste d'opposition : plus aucun contact.";
      return fin();
    }
    if (/supprim/.test(infos)) {
      sortie.actions.push("demande_suppression", "transmettre_responsable");
      sortie.escalade = "Demande de suppression des données : à traiter par le responsable.";
      sortie.reponse_au_responsable =
        "(Recruteur simulé) Demande de suppression enregistrée ; contact arrêté.";
      return fin();
    }
    let reponse = "Merci pour votre message.";
    if (/vraie personne|un humain|un robot/.test(infos))
      reponse =
        "Je suis une intelligence artificielle : l'assistant de recrutement du projet. Les décisions sont prises par le responsable du projet, un humain.";
    else if (/engag/.test(infos))
      reponse =
        "Vous ne vous engagez à rien : aucun engagement n'existe avant un accord écrit, relu par un juriste et signé par le responsable du projet et par vous.";
    else if (
      /\?/.test(infos) &&
      !/pièce|combien|payé|rémunér|salaire|fonctionnaire|public/.test(infos)
    ) {
      sortie.actions.push("transmettre_responsable");
      sortie.escalade = "Question hors de la FAQ de recrutement.";
      reponse =
        "Je ne connais pas la réponse à cette question et je préfère ne rien inventer : je la transmets au responsable du projet.";
    }
    if (/pièce d'identité|carte d'identité|passeport/.test(infos)) {
      sortie.actions = sortie.actions.filter((a) => a !== "transmettre_responsable");
      sortie.actions.push("piece_identite_non_conservee", "transmettre_responsable");
      sortie.escalade = "Pièce d'identité reçue : non conservée.";
      reponse =
        "Merci, mais une pièce d'identité n'est pas nécessaire : nous ne la conservons pas. Vous pourrez confirmer votre fonction par le moyen de votre choix.";
    } else if (/combien|payé|rémunér|salaire/.test(infos)) {
      sortie.actions.push("transmettre_responsable");
      sortie.escalade = "Question sur la rémunération : conditions non validées.";
      reponse =
        "Je ne peux pas répondre sur ce point : je transmets votre question au responsable du projet, qui vous répondra.";
    } else if (
      /fonctionnaire|enseignement public|secteur public|établissement public/.test(infos)
    ) {
      sortie.actions.push("verifier_secteur_public", "transmettre_responsable");
      sortie.escalade =
        "Agent du secteur public : une autorisation éventuelle est à vérifier (sans trancher).";
      reponse =
        "Merci pour cette précision : le responsable du projet regardera avec vous si une démarche auprès de votre employeur est utile.";
    }
    sortie.message_candidat = {
      nature: "reponse",
      objet: "Votre message",
      texte: `Bonjour ${nom},\n\n${reponse}\n\n${signature} Pour ne plus être contacté, répondez STOP.`,
    };
    return fin();
  }
  if (tache === "qualifier") {
    const incoherence = /incohérence|ne correspond pas|aucune trace|contradict/.test(infos);
    const enseigne = /enseigne|professeur|cours de/.test(infos);
    const publicSecteur = /fonctionnaire|public/.test(infos);
    if (incoherence) {
      sortie.actions.push("signaler_incoherence", "transmettre_responsable");
      sortie.escalade =
        "Les informations déclarées et la source ne concordent pas : à vérifier avec la personne, sans conclusion.";
    }
    if (publicSecteur) sortie.actions.push("verifier_secteur_public");
    sortie.fiche = {
      adequation: incoherence || !enseigne ? "impossible_a_evaluer" : "forte",
      justification: enseigne
        ? "« enseigne la matière au niveau visé » d'après les informations fournies."
        : "Les informations ne disent rien de l'expérience d'enseignement.",
      points_a_verifier: [
        "Disponibilité réelle",
        ...(incoherence ? ["Fonction déclarée à confirmer par la personne"] : []),
      ],
      secteur_public_a_verifier: publicSecteur,
    };
    sortie.reponse_au_responsable = "(Recruteur simulé) Fiche qualifiée sur critères pédagogiques.";
    return fin();
  }
  if (tache === "relance") {
    if (relanceEnvoyee) {
      sortie.reponse_au_responsable =
        "(Recruteur simulé) Une relance a déjà été envoyée : arrêt, plus de contact.";
      return fin();
    }
    sortie.message_candidat = {
      nature: "relance",
      objet: "Rappel : proposition de relecture",
      texte: `Bonjour ${nom},\n\nJe me permets un unique rappel de mon précédent message. Il n'y aura pas d'autre relance. ${signature} Pour ne plus être contacté, répondez STOP.`,
    };
    return fin();
  }
  sortie.message_candidat = {
    nature: "premier_contact",
    objet: "Proposition : relire des cours en ligne",
    texte: `Bonjour ${nom},\n\n${signature} Nous vous avons connu par la source suivante : ${source}. Le projet prépare des cours en ligne pour le collège et le lycée ; nous cherchons des enseignants pour relire et valider le programme, les scripts et les quiz de leur matière. Il n'y a aucun engagement à ce stade. Si cela vous intéresse, répondez à ce message ; sinon, répondez STOP et nous ne vous écrirons plus.`,
  };
  sortie.reponse_au_responsable = "(Recruteur simulé) Brouillon prêt pour votre approbation.";
  return fin();
}

/** Correction simulée d'une réponse courte. */
function correctionSimulee(demande: string): BetaMessage {
  const attendue = demande.match(/Réponse attendue : (.*)/)?.[1]?.trim() ?? "";
  const reponse =
    demande.match(/<reponse_eleve>\n([\s\S]*?)\n<\/reponse_eleve>/)?.[1]?.trim() ?? "";
  const contestations = (demande.match(/<message_eleve>/g) ?? []).length;
  const detresse = /disparaître|n'en peux plus|peur de rentrer/i.test(demande);
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
    if ("faq_utilisees" in champs) return supportSimule(demande);
    if ("propositions_liens" in champs) return coordinateurSimule(demande);
    if ("comparaison" in champs) return conformiteSimulee(demande);
    if ("message_candidat" in champs) return recruteurSimule(demande);
    if ("priorites" in champs) return planSimule(demande);
    if ("points_forts" in champs)
      return message(
        [
          texte(
            JSON.stringify({
              progression: "(Tuteur simulé) Travail régulier cette semaine.",
              points_forts: ["Régularité (simulé)."],
              points_a_renforcer: ["Revoir un chapitre (simulé)."],
              suggestions: ["Courtes séances avec des pauses (simulé)."],
            }),
          ),
        ],
        "end_turn",
      );
    if ("refus" in champs) {
      const accord = /Accord aux rapports enregistré et actif : oui/.test(demande);
      const comparer = /autres|plus faible|classement|meilleur/i.test(demande);
      const reponse = !accord
        ? "(Tuteur simulé) Je ne peux rien vous dire sans votre accord enregistré : votre enfant peut le demander depuis son espace, puis vous l'acceptez par le lien reçu."
        : comparer
          ? "(Tuteur simulé) Je ne compare pas les élèves entre eux. Je peux vous dire où en est votre enfant et ses points forts."
          : "(Tuteur simulé) Votre enfant progresse régulièrement.";
      return message(
        [texte(JSON.stringify({ reponse, refus: !accord || comparer, a_transmettre: false }))],
        "end_turn",
      );
    }
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
