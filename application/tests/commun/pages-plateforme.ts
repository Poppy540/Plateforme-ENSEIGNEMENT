import { expect, devices, type Browser, type BrowserContext, type Page } from "@playwright/test";
import {
  RALENTISSEMENT_PROCESSEUR,
  octetsParNature,
  type Nature,
  type Public,
  type Reseau,
  type RessourceMesuree,
  type TempsReseau,
} from "../../src/lib/exploitation/faible-debit";
import { classeEnSql, empreinteCode } from "../../src/lib/invitation";
import {
  creerAdministrateurFictif,
  creerInvitationFictive,
  executerSql,
  identifiantSimule,
  inscrireEleveActif,
  seConnecter,
} from "../bout-en-bout/outils";

// Toutes les pages de la plateforme, ouvertes une à une par un parcours sur données FICTIVES (Jalon 18 ; ADR
// 0098) : utilisé par la mesure complète (`pnpm mesurer:pages`) et par les budgets vérifiés à chaque contrôle
// (tests/bout-en-bout/poids-pages.spec.ts). Un chapitre de 5e que les autres tests n'utilisent pas.
const BASE = "http://localhost:3100";
const TELEPHONE = devices["Pixel 7"];

const ELEVE = "+999 000 035 01";
const REFERENT = "+999 000 035 02";
const ADMIN = "+999 000 035 03";
const ENSEIGNANT = "+999 000 035 04";
const ELEVE_EN_ATTENTE = "+999 000 035 05";
const UNITE = "ga-5e-mathematiques";
const CHAPITRE = "fractions-operations";

export type Etat = Awaited<ReturnType<BrowserContext["storageState"]>>;

export interface PageOuverte {
  public: Public;
  nom: string;
  chemin: string;
  etat?: Etat;
}

export async function nouveauContexte(browser: Browser, etat?: Etat) {
  return browser.newContext({ ...TELEPHONE, baseURL: BASE, storageState: etat });
}

/**
 * Octets réellement passés par le réseau (protocole du navigateur), préchargements compris : une ressource
 * servie par le cache ou le service worker compte pour ce qu'elle a coûté, c'est-à-dire presque rien.
 */
async function journalReseau(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  let requetes = new Map<string, RessourceMesuree>();
  cdp.on("Network.requestWillBeSent", (e) =>
    requetes.set(e.requestId, { adresse: e.request.url, initiateur: e.type ?? "Other", octets: 0 }),
  );
  cdp.on("Network.loadingFinished", (e) => {
    const r = requetes.get(e.requestId);
    if (r) r.octets = e.encodedDataLength;
  });
  return {
    /** Ressources depuis le dernier appel, puis remise à zéro. */
    relever: () => {
      const liste = [...requetes.values()];
      requetes = new Map();
      return liste;
    },
  };
}

/** Chargement complet : réseau au repos, puis le temps des préchargements des liens visibles. */
async function charger(page: Page, chemin: string, attenteMs: number) {
  await page.goto(chemin, { waitUntil: "networkidle" });
  await page.waitForTimeout(attenteMs);
}

/** Poids au premier chargement (téléphone vide), puis page rouverte (fichiers statiques déjà là). */
export async function mesurerPoids(
  browser: Browser,
  p: PageOuverte,
  attenteMs = 1500,
): Promise<{ premierChargement: Record<Nature, number>; navigation: number }> {
  const contexte = await nouveauContexte(browser, p.etat);
  const page = await contexte.newPage();
  const reseau = await journalReseau(page);
  await charger(page, p.chemin, attenteMs);
  expect(page.url(), `${p.nom} : redirigé`).toContain(p.chemin.split("?")[0]);
  const premierChargement = octetsParNature(reseau.relever());
  await charger(page, p.chemin, attenteMs);
  const navigation = reseau.relever().reduce((t, r) => t + r.octets, 0);
  await contexte.close();
  return { premierChargement, navigation };
}

/** Temps d'affichage et temps avant usage sur un réseau simulé, processeur ralenti. */
export async function mesurerTemps(
  browser: Browser,
  p: PageOuverte,
  reseau: Reseau,
): Promise<TempsReseau> {
  const contexte = await nouveauContexte(browser, p.etat);
  const page = await contexte.newPage();
  const cdp = await contexte.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: reseau.latenceMs,
    downloadThroughput: (reseau.descendantKbits * 1024) / 8,
    uploadThroughput: (reseau.montantKbits * 1024) / 8,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: RALENTISSEMENT_PROCESSEUR });
  await page.goto(p.chemin, { waitUntil: "load", timeout: 120_000 });
  const temps = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    const fcp = performance.getEntriesByName("first-contentful-paint")[0];
    return { affichageMs: fcp?.startTime ?? nav.loadEventEnd, utilisableMs: nav.loadEventEnd };
  });
  await contexte.close();
  return temps;
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

/**
 * Crée les données fictives et appelle `visiter` pour chaque page, au moment où elle est dans l'état voulu (une
 * page d'activation, par exemple, doit être mesurée avant l'activation).
 */
export async function parcourirPages(
  browser: Browser,
  visiterPage: (p: PageOuverte) => Promise<void>,
): Promise<void> {
  const visiter = (p: Public, nom: string, chemin: string, etat?: Etat) =>
    visiterPage({ public: p, nom, chemin, etat });

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
     where u.code = $1 and c.code = $2`,
    [UNITE, CHAPITRE],
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
  await visiter("referent", "Espace du référent", "/referent", etatReferent);
  await visiter("referent", "Accueil du référent", "/referent/accueil", etatReferent);
  await visiter("referent", "Chapitre à relire", `/referent/chapitres/${chapitre}`, etatReferent);
  await visiter("referent", "Quiz à relire", `/referent/quiz/${quiz}`, etatReferent);
  await visiter("referent", "Script à relire", `/referent/scripts/${script}`, etatReferent);
  await visiter("referent", "Liens de prérequis", "/referent/prerequis", etatReferent);
  await visiter("referent", "Conformité", "/referent/conformite", etatReferent);
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
    await visiter("visiteur", nom, chemin);

  // --- Élève (actif) et parent ---------------------------------------------------------------------------
  const ctxEleve = await nouveauContexte(browser);
  const eleve = await ctxEleve.newPage();
  await inscrireEleveActif(eleve, ELEVE, "5e");
  const etatEleve = await etatDe(eleve);
  await visiter("eleve", "Espace de l'élève", "/espace", etatEleve);
  await visiter("eleve", "Mes cours", "/catalogue", etatEleve);
  await visiter("eleve", "Chapitres d'une matière", `/catalogue/${UNITE}`, etatEleve);
  await visiter("eleve", "Chapitre", `/catalogue/${UNITE}/${codeChapitre}`, etatEleve);
  await visiter("eleve", "Quiz", `/catalogue/${UNITE}/${codeChapitre}/quiz`, etatEleve);
  await visiter("eleve", "Plan de révision", "/espace/plan", etatEleve);
  await visiter("eleve", "Mes données", "/espace/mes-donnees", etatEleve);
  await visiter("eleve", "Questionnaire", "/espace/questionnaire", etatEleve);

  // Parent : rapports proposés par l'élève, accord, puis rapport hebdomadaire (exécuteur planifié de test).
  await eleve.goto("/espace/plan");
  await eleve.getByRole("button", { name: "Proposer les rapports à mon parent" }).click();
  await expect(eleve.getByText(/en attente de l'accord de ton parent/)).toBeVisible();
  const accord = await lienRecu(eleve, /https?:\/\/\S+\/parent\/rapports\/accord\?jeton=[0-9a-f]+/);
  await visiter("parent", "Accord pour les rapports", accord);
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
  await visiter("parent", "Rapport hebdomadaire", rapport);
  await ctxEleve.close();

  // Élève en attente et accord d'inscription du parent ; pages de connexion et d'inscription.
  const ctxAttente = await nouveauContexte(browser);
  const attente = await ctxAttente.newPage();
  await attente.goto("/connexion");
  await attente.getByLabel("Ton numéro de téléphone").fill(ELEVE_EN_ATTENTE);
  await attente.getByRole("button", { name: "Recevoir un code" }).click();
  await expect(attente.getByRole("heading", { name: "Entre ton code" })).toBeVisible();
  await visiter(
    "visiteur",
    "Saisie du code",
    "/connexion/code",
    await attente.context().storageState(),
  );
  await attente.getByLabel("Code reçu").fill("123456");
  await attente.getByRole("button", { name: "Valider" }).click();
  await expect(attente).toHaveURL(/\/inscription$/);
  await visiter("eleve", "Inscription", "/inscription", await etatDe(attente));
  await attente.getByLabel("Ton prénom ou un pseudonyme").fill("Élève fictif");
  await attente.getByLabel("Ta classe").selectOption({ label: "5e" });
  await attente.getByLabel("Numéro ou email d'un parent ou tuteur").fill("+999 111 003 505");
  await attente.getByRole("button", { name: "M'inscrire" }).click();
  await expect(attente).toHaveURL(/\/espace$/);
  const confirmer = await lienRecu(attente, /https?:\/\/\S+\/parent\/confirmer\?jeton=[0-9a-f]+/);
  await visiter("parent", "Accord d'inscription", confirmer);
  await ctxAttente.close();

  // --- Enseignant ----------------------------------------------------------------------------------------
  await executerSql(
    classeEnSql({
      referentiel: "ga-general",
      niveau: "5e",
      serie: null,
      nom: "5e fictive (mesures)",
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
  await visiter("enseignant", "Activation", "/enseignant/activer", await etatDe(enseignant));
  await enseignant.getByLabel("Votre prénom ou un pseudonyme").fill("Enseignant fictif mesures");
  await enseignant.getByLabel("Code d'invitation").fill("TEST-MESU-ENSE");
  await enseignant.getByRole("button", { name: "Activer mon accès" }).click();
  await expect(enseignant).toHaveURL(/\/enseignant$/);
  await visiter("enseignant", "Vue de la classe", "/enseignant", await etatDe(enseignant));
  await ctxEnseignant.close();

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
    await visiter("administration", nom, chemin, etatAdmin);

  // Nettoyage : rien de ce parcours ne doit compter dans les autres tests (scripts à relire, rapports envoyés).
  await executerSql("delete from scripts where chapitre_id = $1", [chapitre]);
  await executerSql("delete from rapports_parents where eleve_id = $1", [identifiantSimule(ELEVE)]);
  await executerSql(
    "update consentements set revoque_le = now() where eleve_id = $1 and type::text like '%rapport%'",
    [identifiantSimule(ELEVE)],
  );
}
