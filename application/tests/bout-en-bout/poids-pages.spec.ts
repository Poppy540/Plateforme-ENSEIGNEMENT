import { expect, test, type Page } from "@playwright/test";
import { inscrireEleveActif, validerChapitresFictifs } from "./outils";

// Connexions lentes (Jalon 5, étape 1 ; ADR 0044) : poids transféré au premier chargement (HTML, scripts,
// styles, images ; vidéo exclue), comparé à un budget, et chargement sur un réseau lent simulé.
const ELEVE = "+999 000 001 99";
// Budget par page au premier chargement, en kilo-octets transférés (compressés).
const BUDGET_KO = Number(process.env.BUDGET_PAGE_KO ?? 0) || 200;

async function poidsKo(page: Page): Promise<number> {
  return page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    const ressources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const octets = [...navigation, ...ressources]
      .filter((r) => !/\.(mp4|webm|m3u8|vtt)(\?|$)/.test(r.name))
      .reduce((s, r) => s + (r.transferSize || r.encodedBodySize || 0), 0);
    return Math.round(octets / 1024);
  });
}

async function charger(page: Page, chemin: string): Promise<number> {
  await page.goto(chemin, { waitUntil: "networkidle" });
  return poidsKo(page);
}

test("poids des pages au premier chargement, sous le budget", async ({ browser }) => {
  await validerChapitresFictifs("ga-3e-mathematiques", 1);
  const mesures: Record<string, number> = {};
  for (const chemin of ["/", "/connexion", "/aide"]) {
    const contexte = await browser.newContext();
    mesures[chemin] = await charger(await contexte.newPage(), chemin);
    await contexte.close();
  }
  const contexte = await browser.newContext();
  const page = await contexte.newPage();
  await inscrireEleveActif(page, ELEVE, "3e");
  await contexte.clearCookies({ name: "connexion_en_cours" });
  const eleve = await browser.newContext({ storageState: await contexte.storageState() });
  const pageEleve = await eleve.newPage();
  mesures["/catalogue"] = await charger(pageEleve, "/catalogue");
  await eleve.close();
  const eleve2 = await browser.newContext({ storageState: await contexte.storageState() });
  mesures["/catalogue/ga-3e-mathematiques/thales"] = await charger(
    await eleve2.newPage(),
    "/catalogue/ga-3e-mathematiques/thales",
  );
  await eleve2.close();
  await contexte.close();
  console.log(`Poids au premier chargement (Ko) : ${JSON.stringify(mesures)}`);
  for (const [chemin, ko] of Object.entries(mesures))
    expect(ko, `${chemin} : ${ko} Ko pour un budget de ${BUDGET_KO} Ko`).toBeLessThanOrEqual(
      BUDGET_KO,
    );
});

test("page de connexion utilisable sur un réseau lent (≈ 2G améliorée)", async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  // 250 kbit/s descendants, 50 kbit/s montants, 600 ms de latence.
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 600,
    downloadThroughput: (250 * 1024) / 8,
    uploadThroughput: (50 * 1024) / 8,
  });
  const debut = Date.now();
  await page.goto("/connexion");
  await expect(page.getByLabel("Ton numéro de téléphone")).toBeEditable();
  const secondes = (Date.now() - debut) / 1000;
  console.log(`Connexion utilisable en ${secondes.toFixed(1)} s sur réseau lent.`);
  expect(secondes).toBeLessThan(20);
});
