import { describe, expect, it } from "vitest";
import { prochaineAction, type EtatChapitrePilote } from "./prochaine-action";

const base: EtatChapitrePilote = {
  chapitre_id: "c",
  unite: "zz-n1-maths",
  titre: "Chapitre fictif",
  statut_chapitre: "valide",
  liens_a_decider: 0,
  script_id: "s",
  statut_script: "valide",
  quiz_id: "q",
  statut_quiz: "valide",
  video_id: null,
  statut_video: null,
};

describe("prochaine action du référent sur un chapitre du pilote (ADR 0070)", () => {
  it("suit l'ordre du guide : programme, prérequis, script, quiz, vidéo facultative", () => {
    const cas: [Partial<EtatChapitrePilote>, string, string | null, number][] = [
      [
        { statut_chapitre: "a_valider", statut_script: null, statut_quiz: null },
        "Valider le programme du chapitre",
        "/referent/chapitres/c",
        1,
      ],
      [{ liens_a_decider: 2 }, "Décider 2 liens de prérequis", "/referent/prerequis", 3],
      [{ liens_a_decider: 1 }, "Décider 1 lien de prérequis", "/referent/prerequis", 3],
      [{ statut_script: "brouillon" }, "Relire le brouillon de script", "/referent/scripts/s", 3],
      [
        { script_id: null, statut_script: null },
        "Faire rédiger un brouillon de script",
        "/referent/chapitres/c",
        3,
      ],
      [
        { statut_script: "rejete" },
        "Faire rédiger un brouillon de script",
        "/referent/chapitres/c",
        3,
      ],
      [{ statut_quiz: "brouillon" }, "Relire le quiz brouillon", "/referent/quiz/q", 3],
      [
        { quiz_id: null, statut_quiz: null },
        "Faire créer un quiz brouillon",
        "/referent/chapitres/c",
        3,
      ],
      [
        { video_id: "v", statut_video: "a_relire" },
        "Relire la vidéo (facultatif)",
        "/referent/videos/v",
        4,
      ],
      [
        { statut_chapitre: "rejete" },
        "Chapitre écarté : à revoir avec le propriétaire",
        "/referent/chapitres/c",
        3,
      ],
    ];
    for (const [modif, libelle, lien, faites] of cas) {
      const a = prochaineAction({ ...base, ...modif });
      expect(a, libelle).toMatchObject({ libelle, lien, faites, pret: false });
    }
  });

  it("un chapitre complet est prêt, avec ou sans vidéo", () => {
    expect(prochaineAction(base)).toMatchObject({ pret: true, faites: 4, lien: null });
    expect(prochaineAction(base).libelle).toContain("leçon écrite");
    expect(prochaineAction({ ...base, video_id: "v", statut_video: "publiee" }).libelle).toContain(
      "vidéo publiée",
    );
  });
});
