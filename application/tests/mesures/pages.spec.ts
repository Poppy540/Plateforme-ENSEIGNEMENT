import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { expect, test, devices, type Browser, type Page } from "@playwright/test";
import {
  RALENTISSEMENT_PROCESSEUR,
  RESEAUX,
  cheminAnonyme,
  octetsParNature,
  rapportMesures,
  type MesurePage,
  type PageNonMesuree,
  type Public,
  type RessourceMesuree,
} from "../../src/lib/exploitation/faible-debit";
import { classeEnSql, empreinteCode } from "../../src/lib/invitation";
import {
  creerAdministrateurFictif,
  creerInvitationFictive,
  executerSql,
  inscrireEleveActif,
  seConnecter,
} from "../bout-en-bout/outils";

// Mesure de toutes les pages en faible débit (Jalon 18, étape 1 ; ADR 0098) : `pnpm mesurer:pages`. Données
// FICTIVES, créées par les mêmes parcours que les tests de bout en bout ; serveur de production local. Écrit
// ../docs/performance/mesures-pages.md (et .json). Ne vérifie aucun budget : c'est l'étape 2.
const SORTIE = process.env.DOSSIER_MESURES ?? "../docs/performance";
const BASE = "http://localhost:3100";
const TELEPHONE = devices["Pixel 7"];

const ELEVE = "+999 000 035 01";
const REFERENT = "+999 000 035 02";
const ADMIN = "+999 000 035 03";
const ENSEIGNANT = "+999 000 035 04";
const ELEVE_EN_ATTENTE = "+999 000 035 05";
const UNITE = "ga-6e-mathematiques";

type Etat = Awaited<ReturnType<import("@playwright/test").BrowserContext["storageState"]>>;

async function nouveauContexte(browser: Browser, etat?: Etat) {
  return browser.newContext({ ...TELEPHONE, baseURL: BASE, storageState: etat });
}

async function ressources(page: Page): Promise<RessourceMesuree[]> {
  return page.evaluate(() =>
    [
      ...(performance.getEntriesByType("navigation") as PerformanceResourceTiming[]),
      ...(performance.getEntriesByType("resource") as PerformanceResourceTiming[]),
    ].map((r) => ({
      adresse: r.name,
      initiateur: r.initiatorType,
      octets: r.transferSize || r.encodedBodySize || 0,
    })),
  );
}

async function mesurer(
  browser: Browser,
  publicVise: Public,
  nom: string,
  chemin: string,
  etat?: Etat,
): Promise<MesurePage> {
  // Premier chargement, puis navigation (même contexte : fichiers statiques déjà en mémoire).
  const contexte = await nouveauContexte(browser, etat);
  const page = await contexte.newPage();
  await page.goto(chemin, { waitUntil: "networkidle" });
  expect(page.url(), `${nom} : redirigé`).toContain(chemin.split("?")[0]);
  const premierChargement = octetsParNature(await ressources(page));
  await page.goto(chemin, { waitUntil: "networkidle" });
  const navigation = (await ressources(page)).reduce((t, r) => t + r.octets, 0);
  await contexte.close();

  const reseaux: MesurePage["reseaux"] = {};
  for (const reseau of RESEAUX) {
    const lent = await nouveauContexte(browser, etat);
    const p = await lent.newPage();
    const cdp = await lent.newCDPSession(p);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: reseau.latenceMs,
      downloadThroughput: (reseau.descendantKbits * 1024) / 8,
      uploadThroughput: (reseau.montantKbits * 1024) / 8,
    });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: RALENTISSEMENT_PROCESSEUR });
    await p.goto(chemin, { waitUntil: "load", timeout: 120_000 });
    reseaux[reseau.code] = await p.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
      const fcp = performance.getEntriesByName("first-contentful-paint")[0];
      return { affichageMs: fcp?.startTime ?? nav.loadEventEnd, utilisableMs: nav.loadEventEnd };
    });
    await lent.close();
  }
  return {
    public: publicVise,
    nom,
    chemin: cheminAnonyme(chemin),
    premierChargement,
    navigation,
    reseaux,
  };
}

async function etatDe(page: Page): Promise<Etat> {
  await page.context().clearCookies({ name: "connexion_en_cours" });
  return page.context().storageState();
}

async function lienRecu(page: Page, motif: RegExp): Promise<string> {
  await page.goto("/developpement/messages");
  const textes = await page.locator(".messages li").allInnerTexts();
  const trouve = textes.map((t) => t.match(motif)?.[0]).find(Boolean);
  expect(trouve, `lien ${motif} introuvable`).toBeTruthy();
  return trouve!.replace(/^https?:\/\/[^/]+/, "");
}

test("mesure de toutes les pages en faible débit", async ({ browser }) => {
  test.setTimeout(45 * 60_000);
  const mesures: MesurePage[] = [];
  const nonMesurees: PageNonMesuree[] = [];
  const ajouter = async (p: Public, nom: string, chemin: string, etat?: Etat) =>
    mesures.push(await mesurer(browser, p, nom, chemin, etat));

  // --- Données fictives : référent, chapitre et quiz validés, brouillon de script --------------------------
  const ctxReferent = await nouveauContexte(browser);
  const referent = await ctxReferent.newPage();
  await creerInvitationFictive("TEST-MESU-0001", ["mathematiques"]);
  await seConnecter(referent, REFERENT);
  await referent.goto("/referent/activer");
  await referent.getByLabel("Votre prénom ou un pseudonyme").fill("Référent fictif mesures");
  await referent.getByLabel("Code d'invitation").fill("TEST-MESU-0001");
  await referent.getByRole("button", { name: "Activer mon accès" }).click();
  await expect(referent).toHaveURL(/\/referent$/);
  const [{ id: chapitre, code: codeChapitre }] = await executerSql(
    `select c.id, c.code from chapitres c join unites u on u.id = c.unite_id
     where u.code = $1 and c.code = 'entiers'`,
    [UNITE],
  );
  await referent.goto(`/referent/chapitres/${chapitre}`);
  await referent.getByLabel(/Commentaire/).fill("Relu pour les mesures (fictif).");
  await referent.getByRole("button", { name: /Valider la version 1/ }).click();
  await expect(referent).toHaveURL(/\/referent$/);
  await referent.goto(`/referent/chapitres/${chapitre}`);
  await referent.getByLabel("Nombre de questions").fill("3");
  await referent.getByRole("button", { name: "Générer un quiz brouillon" }).click();
  await expect(referent.getByRole("status")).toContainText("Quiz version 1 créé");
  await referent.getByLabel(/Durée cible/).fill("8");
  await referent.getByRole("button", { name: "Générer un brouillon de script" }).click();
  await expect(referent.getByText("Brouillon version 1 créé")).toBeVisible();
  const [{ id: quiz }] = await executerSql("select id from quiz where chapitre_id = $1", [
    chapitre,
  ]);
  const [{ id: script }] = await executerSql("select id from scripts where chapitre_id = $1", [
    chapitre,
  ]);
  const etatReferent = await etatDe(referent);
  await ajouter("referent", "Espace du référent", "/referent", etatReferent);
  await ajouter("referent", "Accueil du référent", "/referent/accueil", etatReferent);
  await ajouter("referent", "Chapitre à relire", `/referent/chapitres/${chapitre}`, etatReferent);
  await ajouter("referent", "Quiz à relire", `/referent/quiz/${quiz}`, etatReferent);
  await ajouter("referent", "Script à relire", `/referent/scripts/${script}`, etatReferent);
  await ajouter("referent", "Liens de prérequis", "/referent/prerequis", etatReferent);
  await ajouter("referent", "Conformité", "/referent/conformite", etatReferent);
  for (const [chemin, raison] of [
    ["/referent/videos/…", "aucune vidéo fictive (fournisseur vidéo non choisi)"],
    ["/referent/conformite/…", "demande un document officiel déposé"],
    ["/referent/coordinateur/…", "demande un rapport du Coordinateur"],
  ])
    nonMesurees.push({ public: "referent", chemin, raison });
  // Quiz validé, pour la page de l'élève.
  await referent.goto(`/referent/quiz/${quiz}`);
  await referent.getByLabel(/J'ai vérifié les points/).check();
  await referent.getByRole("button", { name: "Valider la version 1" }).click();
  await expect(referent.getByText("Statut : Validé")).toBeVisible();
  await ctxReferent.close();

  // --- Visiteur ------------------------------------------------------------------------------------------
  for (const [nom, chemin] of [
    ["Accueil", "/"],
    ["Connexion", "/connexion"],
    ["Aide", "/aide"],
    ["Pas de connexion", "/hors-ligne"],
  ])
    await ajouter("visiteur", nom, chemin);
  nonMesurees.push({
    public: "visiteur",
    chemin: "/indisponible",
    raison:
      "affichée seulement quand l'accès des élèves est fermé ; même gabarit que « Pas de connexion »",
  });

  // --- Élève (actif) et parent ---------------------------------------------------------------------------
  const ctxEleve = await nouveauContexte(browser);
  const eleve = await ctxEleve.newPage();
  await inscrireEleveActif(eleve, ELEVE, "6e");
  const etatEleve = await etatDe(eleve);
  await ajouter("eleve", "Espace de l'élève", "/espace", etatEleve);
  await ajouter("eleve", "Mes cours", "/catalogue", etatEleve);
  await ajouter("eleve", "Chapitres d'une matière", `/catalogue/${UNITE}`, etatEleve);
  await ajouter("eleve", "Chapitre", `/catalogue/${UNITE}/${codeChapitre}`, etatEleve);
  await ajouter("eleve", "Quiz", `/catalogue/${UNITE}/${codeChapitre}/quiz`, etatEleve);
  await ajouter("eleve", "Plan de révision", "/espace/plan", etatEleve);
  await ajouter("eleve", "Mes données", "/espace/mes-donnees", etatEleve);
  await ajouter("eleve", "Questionnaire", "/espace/questionnaire", etatEleve);

  // Parent : rapports proposés par l'élève, accord, puis rapport hebdomadaire (exécuteur planifié de test).
  await eleve.goto("/espace/plan");
  await eleve.getByRole("button", { name: "Proposer les rapports à mon parent" }).click();
  await expect(eleve.getByText(/en attente de l'accord de ton parent/)).toBeVisible();
  const accord = await lienRecu(eleve, /https?:\/\/\S+\/parent\/rapports\/accord\?jeton=[0-9a-f]+/);
  await ajouter("parent", "Accord pour les rapports", accord);
  const ctxParent = await nouveauContexte(browser);
  const parent = await ctxParent.newPage();
  await parent.goto(accord);
  await parent.getByRole("button", { name: "J'accepte de recevoir les rapports" }).click();
  await expect(parent.getByRole("status")).toContainText("Vous recevrez un court rapport");
  await ctxParent.close();
  const reponse = await eleve.request.post("/api/orchestrateur/executer", {
    headers: { authorization: "Bearer jeton-de-test-uniquement-pas-un-secret-0000" },
  });
  expect(reponse.status()).toBe(200);
  const rapport = await lienRecu(eleve, /https?:\/\/\S+\/parent\/rapport\?jeton=[0-9a-f]+/);
  await ajouter("parent", "Rapport hebdomadaire", rapport);
  await ctxEleve.close();

  // Élève en attente et accord d'inscription du parent ; pages de connexion et d'inscription.
  const ctxAttente = await nouveauContexte(browser);
  const attente = await ctxAttente.newPage();
  await attente.goto("/connexion");
  await attente.getByLabel("Ton numéro de téléphone").fill(ELEVE_EN_ATTENTE);
  await attente.getByRole("button", { name: "Recevoir un code" }).click();
  await expect(attente.getByRole("heading", { name: "Entre ton code" })).toBeVisible();
  await ajouter(
    "visiteur",
    "Saisie du code",
    "/connexion/code",
    await attente.context().storageState(),
  );
  await attente.getByLabel("Code reçu").fill("123456");
  await attente.getByRole("button", { name: "Valider" }).click();
  await expect(attente).toHaveURL(/\/inscription$/);
  await ajouter("eleve", "Inscription", "/inscription", await etatDe(attente));
  await attente.getByLabel("Ton prénom ou un pseudonyme").fill("Élève fictif");
  await attente.getByLabel("Ta classe").selectOption({ label: "6e" });
  await attente.getByLabel("Numéro ou email d'un parent ou tuteur").fill("+999 111 003 505");
  await attente.getByRole("button", { name: "M'inscrire" }).click();
  await expect(attente).toHaveURL(/\/espace$/);
  const confirmer = await lienRecu(attente, /https?:\/\/\S+\/parent\/confirmer\?jeton=[0-9a-f]+/);
  await ajouter("parent", "Accord d'inscription", confirmer);
  await ctxAttente.close();

  // --- Enseignant ----------------------------------------------------------------------------------------
  await executerSql(
    classeEnSql({
      referentiel: "ga-general",
      niveau: "6e",
      serie: null,
      nom: "6e fictive (mesures)",
      etablissement: "Collège fictif",
      empreinteClasse: empreinteCode("TEST-MESU-CLAS"),
      empreinteEnseignant: empreinteCode("TEST-MESU-ENSE"),
      joursCodeClasse: 30,
      joursInvitation: 1,
      capacite: 30,
    }),
  );
  const ctxEnseignant = await nouveauContexte(browser);
  const enseignant = await ctxEnseignant.newPage();
  await seConnecter(enseignant, ENSEIGNANT);
  await enseignant.goto("/enseignant/activer");
  await ajouter("enseignant", "Activation", "/enseignant/activer", await etatDe(enseignant));
  await enseignant.getByLabel("Votre prénom ou un pseudonyme").fill("Enseignant fictif mesures");
  await enseignant.getByLabel("Code d'invitation").fill("TEST-MESU-ENSE");
  await enseignant.getByRole("button", { name: "Activer mon accès" }).click();
  await expect(enseignant).toHaveURL(/\/enseignant$/);
  await ajouter("enseignant", "Vue de la classe", "/enseignant", await etatDe(enseignant));
  await ctxEnseignant.close();
  nonMesurees.push({
    public: "referent",
    chemin: "/referent/activer",
    raison: "même gabarit que l'activation de l'enseignant",
  });

  // --- Administration ------------------------------------------------------------------------------------
  await creerAdministrateurFictif(ADMIN);
  const ctxAdmin = await nouveauContexte(browser);
  const admin = await ctxAdmin.newPage();
  await seConnecter(admin, ADMIN);
  const etatAdmin = await etatDe(admin);
  await ctxAdmin.close();
  for (const [nom, chemin] of [
    ["Tableau de l'administration", "/administration"],
    ["Tableau de bord du pilote", "/administration/tableau-de-bord"],
    ["Ce qui vous attend", "/administration/attentes"],
    ["Conditions du pilote", "/administration/conditions"],
    ["Chapitres du pilote", "/administration/pilote"],
    ["Classes du pilote", "/administration/classes"],
    ["Inviter un référent", "/administration/invitations"],
    ["Critères de suspension", "/administration/criteres"],
    ["Semaine du pilote", "/administration/semaine"],
    ["Journal du pilote", "/administration/journal"],
    ["Rapport de fin", "/administration/fin-pilote"],
    ["Clôture", "/administration/cloture"],
    ["Sort des données", "/administration/donnees"],
    ["Pilotage", "/administration/exploitation"],
    ["Recrutement", "/administration/recrutement"],
  ])
    await ajouter("administration", nom, chemin, etatAdmin);
  nonMesurees.push({
    public: "administration",
    chemin: "/administration/recrutement/…",
    raison: "demande une fiche candidat",
  });

  // --- Rapport ---------------------------------------------------------------------------------------------
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
