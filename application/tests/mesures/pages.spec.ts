import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { test } from "@playwright/test";
import {
  RESEAUX,
  ROUTES,
  cheminAnonyme,
  rapportMesures,
  type MesurePage,
  type PageNonMesuree,
} from "../../src/lib/exploitation/faible-debit";
import { mesurerPoids, mesurerTemps, parcourirPages } from "../commun/pages-plateforme";

// Mesure de toutes les pages en faible débit (Jalon 18, étape 1 ; ADR 0098) : `pnpm mesurer:pages`. Données
// FICTIVES, serveur de production local. Écrit ../docs/performance/mesures-pages.md (et .json). Les budgets
// sont vérifiés à chaque contrôle par tests/bout-en-bout/poids-pages.spec.ts.
const SORTIE = process.env.DOSSIER_MESURES ?? "../docs/performance";

test("mesure de toutes les pages en faible débit", async ({ browser }) => {
  test.setTimeout(45 * 60_000);
  const mesures: MesurePage[] = [];
  await parcourirPages(browser, async (p) => {
    const poids = await mesurerPoids(browser, p);
    const reseaux: MesurePage["reseaux"] = {};
    for (const reseau of RESEAUX) reseaux[reseau.code] = await mesurerTemps(browser, p, reseau);
    mesures.push({
      public: p.public,
      nom: p.nom,
      chemin: cheminAnonyme(p.chemin),
      ...poids,
      reseaux,
    });
  });
  const nonMesurees: PageNonMesuree[] = Object.entries(ROUTES).flatMap(([chemin, r]) =>
    typeof r === "object" && r.public !== "developpement"
      ? [{ public: r.public, chemin, raison: r.raison }]
      : [],
  );

  let commit: string | null = null;
  try {
    commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    // hors d'un dépôt git
  }
  mkdirSync(SORTIE, { recursive: true });
  const date = new Date().toISOString();
  writeFileSync(
    `${SORTIE}/mesures-pages.json`,
    JSON.stringify({ date, commit, mesures, nonMesurees }, null, 2),
  );
  writeFileSync(
    `${SORTIE}/mesures-pages.md`,
    rapportMesures(mesures, nonMesurees, { date, commit }),
  );
  console.log(`${mesures.length} pages mesurées ; rapport : ${SORTIE}/mesures-pages.md`);
});
