// Prochaine action du référent sur un chapitre du pilote (Jalon 11, étape 1 ; ADR 0070). Fonction pure : l'état
// vient de la base (etat_chapitres_pilote), l'ordre suit le guide du référent (programme, prérequis, script, quiz,
// vidéo facultative).

export interface EtatChapitrePilote {
  chapitre_id: string;
  unite: string;
  titre: string;
  statut_chapitre: string;
  liens_a_decider: number;
  script_id: string | null;
  statut_script: string | null;
  quiz_id: string | null;
  statut_quiz: string | null;
  video_id: string | null;
  statut_video: string | null;
}

export interface ProchaineAction {
  libelle: string;
  lien: string | null;
  /** Étapes faites parmi les quatre obligatoires : programme, prérequis, script, quiz. */
  faites: number;
  pret: boolean;
}

export function prochaineAction(e: EtatChapitrePilote): ProchaineAction {
  const chapitre = `/referent/chapitres/${e.chapitre_id}`;
  const programme = e.statut_chapitre === "valide";
  const prerequis = e.liens_a_decider === 0;
  const script = e.statut_script === "valide";
  const quiz = e.statut_quiz === "valide";
  const faites = [programme, prerequis, script, quiz].filter(Boolean).length;
  const action = (libelle: string, lien: string | null) => ({ libelle, lien, faites, pret: false });

  if (e.statut_chapitre === "rejete")
    return action("Chapitre écarté : à revoir avec le propriétaire", chapitre);
  if (!programme) return action("Valider le programme du chapitre", chapitre);
  if (!prerequis)
    return action(
      `Décider ${e.liens_a_decider} lien${e.liens_a_decider > 1 ? "s" : ""} de prérequis`,
      "/referent/prerequis",
    );
  if (e.statut_script === "brouillon" && e.script_id)
    return action("Relire le brouillon de script", `/referent/scripts/${e.script_id}`);
  if (!script) return action("Faire rédiger un brouillon de script", chapitre);
  if (e.statut_quiz === "brouillon" && e.quiz_id)
    return action("Relire le quiz brouillon", `/referent/quiz/${e.quiz_id}`);
  if (!quiz) return action("Faire créer un quiz brouillon", chapitre);
  if (e.statut_video === "a_relire" && e.video_id)
    return action("Relire la vidéo (facultatif)", `/referent/videos/${e.video_id}`);
  return {
    libelle:
      e.statut_video === "publiee"
        ? "Prêt pour les élèves (vidéo publiée)"
        : "Prêt pour les élèves (leçon écrite ; vidéo facultative)",
    lien: null,
    faites,
    pret: true,
  };
}
