import "server-only";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { dossierPack, racineDepot } from "@/lib/agents/chargeur-prompt";
import { lirePack } from "@/lib/pack-pays/lecture";
import { evaluerAttentes, type FaitsAttentes } from "@/lib/pilote/attentes";
import { avecUtilisateur } from "./base";
import { conditionsDuPilote } from "./conditions-pilote";
import { criteresDuPilote } from "./criteres-pilote";
import { periodeDuPilote } from "./fin-pilote";

// Ce qui attend le propriétaire (ADR 0089) : états lus dans la plateforme (conditions, critères, période, faits du
// pilote), dans le pack des pays du pilote (questionnaire) et dans les skills du projet (« À valider »).

/** Skills écrites pour le projet et soumises à la validation du propriétaire (ADR 0068, 0071). */
const SKILLS_A_VALIDER = [
  "agents/_commun/skills/eleves-mineurs/SKILL.md",
  "agents/coordinateur/skills/files-d-approbation/SKILL.md",
];

function skillsAValider(): string[] {
  return SKILLS_A_VALIDER.filter((chemin) => {
    const fichier = join(racineDepot(), chemin);
    return (
      existsSync(fichier) && readFileSync(fichier, "utf8").includes("À valider par le propriétaire")
    );
  });
}

export async function attentesDuProprietaire(administrateur: string) {
  const [conditions, { pays, criteres }, periode, faits] = await Promise.all([
    conditionsDuPilote(administrateur),
    criteresDuPilote(administrateur),
    periodeDuPilote(administrateur),
    avecUtilisateur(administrateur, async (client) => {
      const { rows } = await client.query(
        "select chapitres_pilote, classes from faits_conditions_pilote()",
      );
      return rows[0] as { chapitres_pilote: number; classes: number };
    }),
  ]);
  const questionnaires = pays.map(
    (code) => lirePack(dossierPack(racineDepot(), code)).questionnaire,
  );
  const f: FaitsAttentes = {
    conditions: Object.fromEntries(conditions.map((c) => [c.numero, c.etat])),
    periodeSaisie: periode !== null,
    chapitresPilote: faits.chapitres_pilote,
    classes: faits.classes,
    questionnaireValide:
      questionnaires.length === 0 || questionnaires.some((q) => q === null)
        ? null
        : questionnaires.every((q) => q!.statut === "valide"),
    seuilsComplets: !criteres.some((c) => c.etat === "non_surveille"),
    skillsAValider: skillsAValider(),
  };
  return evaluerAttentes(f);
}
