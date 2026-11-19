import { expect, test } from "@playwright/test";
import {
  BUDGETS,
  RESEAUX,
  ROUTES,
  cheminAnonyme,
  depassements,
  ko,
  routeDe,
  totalOctets,
  type Public,
} from "../../src/lib/exploitation/faible-debit";
import { mesurerPoids, mesurerTemps, parcourirPages } from "../commun/pages-plateforme";

// Budgets de poids et de temps de TOUTES les pages (Jalon 18, étape 2 ; ADR 0099, après l'ADR 0044). Chaque
// page est ouverte sur données fictives ; son poids au premier chargement et rouverte est comparé au budget de
// son public. Le temps en 2G (processeur ralenti) est vérifié sur la première page de chaque public : il dépend
// surtout du socle commun. Une page de l'application ni mesurée ni excusée (raison dans ROUTES) fait échouer.
const DEUX_G = RESEAUX.find((r) => r.code === "2g")!;

test("toutes les pages dans le budget de leur public (poids, et temps en 2G)", async ({
  browser,
}) => {
  test.setTimeout(15 * 60_000);
  const ecarts: string[] = [];
  const routesVues = new Set<string>();
  const publicsChronometres = new Set<Public>();
  const resume: string[] = [];

  await parcourirPages(browser, async (p) => {
    const route = routeDe(p.chemin);
    expect(route, `${p.chemin} : aucune route connue`).not.toBeNull();
    expect(ROUTES[route!], `${route} : public différent`).toBe(p.public);
    routesVues.add(route!);
    const poids = await mesurerPoids(browser, p, 500);
    let reseaux;
    if (!publicsChronometres.has(p.public)) {
      publicsChronometres.add(p.public);
      reseaux = { "2g": await mesurerTemps(browser, p, DEUX_G) };
    }
    const chemin = cheminAnonyme(p.chemin);
    ecarts.push(...depassements({ public: p.public, chemin, ...poids, reseaux }));
    resume.push(
      `${chemin} ${ko(totalOctets(poids.premierChargement))}/${BUDGETS[p.public].premierKo} Ko` +
        (reseaux ? ` (2G : ${(reseaux["2g"].utilisableMs / 1000).toFixed(1)} s)` : ""),
    );
  });
  console.log(`Poids au premier chargement / budget :\n${resume.join("\n")}`);

  const aMesurer = Object.entries(ROUTES)
    .filter(([, r]) => typeof r === "string")
    .map(([route]) => route);
  expect(
    aMesurer.filter((r) => !routesVues.has(r)),
    "pages sans mesure ni raison dans ROUTES",
  ).toEqual([]);
  expect(ecarts, ecarts.join("\n")).toEqual([]);
});
