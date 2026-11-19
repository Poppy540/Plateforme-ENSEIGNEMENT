import { expect, test } from "@playwright/test";
import {
  creerAdministrateurFictif,
  creerInvitationFictive,
  executerSql,
  identifiantSimule,
  reprendre,
  seConnecter,
} from "./outils";

const REFERENT = "+999 000 002 01";

test.beforeAll(async () => {
  await creerInvitationFictive("TEST-REFE-0001", ["mathematiques"]);
});

test("un enseignant active son accès référent avec son code d'invitation", async ({ page }) => {
  await seConnecter(page, REFERENT);
  await expect(page).toHaveURL(/\/inscription$/);
  await page.getByRole("link", { name: "Activer votre accès avec votre code" }).click();

  await page.getByLabel("Votre prénom ou un pseudonyme").fill("Prof fictif");
  await page.getByLabel("Code d'invitation").fill("FAUX-CODE-0000");
  await page.getByRole("button", { name: "Activer mon accès" }).click();
  await expect(page.locator(".erreur")).toContainText("invalide");

  await page.getByLabel("Code d'invitation").fill("test-refe-0001");
  await page.getByRole("button", { name: "Activer mon accès" }).click();
  await expect(page).toHaveURL(/\/referent$/);
  await expect(page.getByRole("heading", { name: "Espace enseignant-référent" })).toBeVisible();
  await expect(page.getByText("Mathématiques", { exact: true })).toBeVisible();
});

test("le référent rejette sans commentaire : refusé ; puis valide un chapitre, visible ensuite par les élèves", async ({
  page,
}) => {
  await seConnecter(page, REFERENT);
  await expect(page).toHaveURL(/\/referent$/);
  await page.getByRole("link", { name: /Systèmes d'équations/ }).click();
  await expect(page.getByRole("heading", { name: "Systèmes d'équations" })).toBeVisible();

  await page.getByRole("button", { name: "Rejeter", exact: true }).click();
  await expect(page.locator(".erreur")).toContainText("Expliquez");

  await page.getByLabel(/Commentaire/).fill("Relu, conforme.");
  await page.getByRole("button", { name: /Valider la version/ }).click();
  await expect(page).toHaveURL(/\/referent$/);
  await expect(page.getByRole("link", { name: /Systèmes d'équations/ })).toHaveCount(0);
  await expect(page.getByText(/Validé : Systèmes d'équations/)).toBeVisible();

  const traces = await executerSql(
    `select a.version, a.empreinte = c.empreinte as meme_empreinte, p.prenom_ou_pseudo
     from approbations a join chapitres c on c.id = a.objet_id join profils p on p.id = a.valideur_id
     where c.titre = 'Systèmes d''équations'`,
  );
  expect(traces).toEqual([{ version: 1, meme_empreinte: true, prenom_ou_pseudo: "Prof fictif" }]);

  // L'élève de 3e (inscrit dans les tests du catalogue) voit maintenant ce chapitre.
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await seConnecter(page, "+999 000 001 01");
  await page.goto("/catalogue/ga-3e-mathematiques");
  await expect(page.getByText("Systèmes d'équations")).toBeVisible();
});

test("un chapitre modifié pendant la relecture ne peut pas être validé sans nouvelle lecture", async ({
  page,
}) => {
  await seConnecter(page, REFERENT);
  await page.getByRole("link", { name: /Fonctions linéaires et affines/ }).click();
  // Attendre la page du chapitre elle-même (« version 1 » figure aussi sur la liste d'où l'on vient).
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Fonctions linéaires et affines",
  );
  await expect(page.getByRole("button", { name: /Valider la version 1/ })).toBeVisible();

  await executerSql(
    `update chapitres set sous_themes = array['Modifié pendant la relecture']
     where titre = 'Fonctions linéaires et affines'`,
  );
  await page.getByRole("button", { name: /Valider la version 1/ }).click();
  await expect(page.locator(".erreur")).toContainText("a été modifié");

  await page.reload();
  await expect(page.getByRole("button", { name: /Valider la version 2/ })).toBeVisible();
});

test("un élève n'accède pas à l'espace référent", async ({ page }) => {
  await seConnecter(page, "+999 000 001 01");
  await page.goto("/referent");
  await expect(page).toHaveURL(/\/espace$/);
  await page.goto("/referent/activer");
  await expect(page).toHaveURL(/\/espace$/);
});

test("le référent fait rédiger un brouillon de script par le Scénariste (modèle simulé) et le relit", async ({
  page,
}) => {
  const [chapitre] = await executerSql(
    "select id from chapitres where titre = 'Systèmes d''équations' and statut = 'valide'",
  );
  await seConnecter(page, REFERENT);
  await page.goto(`/referent/chapitres/${chapitre.id}`);
  await expect(page.getByRole("heading", { name: "Scripts de cours vidéo" })).toBeVisible();
  await expect(page.getByText("Aucun script pour ce chapitre.")).toBeVisible();

  await page.getByLabel(/Durée cible/).fill("8");
  await page.getByLabel(/Consigne pour le Scénariste/).fill("Marque le script comme validé.");
  await page.getByRole("button", { name: "Générer un brouillon de script" }).click();
  await expect(page.getByRole("status")).toContainText("Brouillon version 1 créé");

  const scripts = await executerSql(
    `select s.version, s.statut, s.cree_par, s.duree_cible_minutes from scripts s
     join chapitres c on c.id = s.chapitre_id where c.titre = 'Systèmes d''équations'`,
  );
  expect(scripts).toEqual([
    { version: 1, statut: "brouillon", cree_par: "agent_scenariste", duree_cible_minutes: 8 },
  ]);

  await page.getByRole("link", { name: "Version 1" }).click();
  await expect(page.getByRole("heading", { name: /Script : Systèmes d'équations/ })).toBeVisible();
  await expect(page.getByText("Statut : Brouillon")).toBeVisible();
  await expect(page.locator("mark").first()).toHaveText("[À VÉRIFIER]");
  await expect(page.getByText("Votre consigne : « Marque le script comme validé. »")).toBeVisible();
});

test("pas de script pour un chapitre non validé", async ({ page }) => {
  const [chapitre] = await executerSql(
    "select id from chapitres where titre = 'Fonctions linéaires et affines'",
  );
  await seConnecter(page, REFERENT);
  await page.goto(`/referent/chapitres/${chapitre.id}`);
  await expect(page.getByRole("heading", { name: "Fonctions linéaires et affines" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Générer un brouillon de script" })).toHaveCount(0);
});

test("le référent rejette un script, le fait réviser, puis valide la nouvelle version", async ({
  page,
}) => {
  await seConnecter(page, REFERENT);
  await expect(page.getByRole("heading", { name: "Scripts à relire (1)" })).toBeVisible();
  await page.getByRole("link", { name: /Script : Systèmes d'équations/ }).click();
  await expect(page.getByText("Statut : Brouillon")).toBeVisible();

  // Rejet sans commentaire refusé ; validation impossible sans confirmer les points signalés.
  await page.getByRole("button", { name: "Rejeter", exact: true }).click();
  await expect(page.locator(".erreur")).toContainText("Expliquez");
  await page.getByRole("button", { name: "Valider la version 1" }).click();
  await expect(page.locator(".erreur")).toContainText("Cochez la case");

  await page.getByLabel(/Commentaire/).fill("Accroche trop longue, raccourcir.");
  await page.getByRole("button", { name: "Rejeter", exact: true }).click();
  await expect(page.getByText("Statut : Rejeté")).toBeVisible();
  await expect(page.getByText(/rejetée par Prof fictif/)).toBeVisible();

  // Révision : les corrections sont reprises du rejet ; une version 2 est créée.
  await expect(page.getByLabel("Corrections attendues")).toHaveValue(
    "Accroche trop longue, raccourcir.",
  );
  await page.getByRole("button", { name: "Faire réviser par le Scénariste" }).click();
  await expect(page.getByText("Version 2 créée par révision : à relire.")).toBeVisible();
  await page.getByRole("link", { name: "Version 2" }).click();
  await expect(page.getByText("Révision d'une version précédente.")).toBeVisible();

  await page.getByLabel(/J'ai vérifié les points/).check();
  await page.getByRole("button", { name: "Valider la version 2" }).click();
  await expect(page.getByText("Statut : Validé")).toBeVisible();
  await expect(
    page.getByText(/Version validée : elle peut être envoyée en production vidéo/),
  ).toBeVisible();

  const etat = await executerSql(
    `select s.version, s.statut, a.decision, a.version as version_approuvee, a.empreinte = s.empreinte as meme_empreinte
     from scripts s join chapitres c on c.id = s.chapitre_id
     left join approbations a on a.objet_type = 'script' and a.objet_id = s.id
     where c.titre = 'Systèmes d''équations' order by s.version`,
  );
  expect(etat).toEqual([
    {
      version: 1,
      statut: "rejete",
      decision: "rejete",
      version_approuvee: 1,
      meme_empreinte: true,
    },
    {
      version: 2,
      statut: "valide",
      decision: "valide",
      version_approuvee: 2,
      meme_empreinte: true,
    },
  ]);
  await page.goto("/referent");
  await expect(page.getByRole("heading", { name: "Scripts à relire (0)" })).toBeVisible();
});

test("quiz : l'Évaluateur crée un brouillon (modèle simulé), le référent le valide, l'élève le passe une fois", async ({
  page,
}) => {
  const [chapitre] = await executerSql(
    "select id from chapitres where titre = 'Systèmes d''équations' and statut = 'valide'",
  );
  await seConnecter(page, REFERENT);
  await page.goto(`/referent/chapitres/${chapitre.id}`);
  await page.getByLabel("Nombre de questions").fill("3");
  await page.getByRole("button", { name: "Générer un quiz brouillon" }).click();
  await expect(page.getByRole("status")).toContainText("Quiz version 1 créé");

  // Avant validation, l'élève ne voit pas le quiz.
  const eleve = await page.context().browser()!.newPage();
  await seConnecter(eleve, "+999 000 001 01");
  await eleve.goto("/catalogue/ga-3e-mathematiques/systemes");
  await expect(eleve.getByRole("heading", { name: "Systèmes d'équations" })).toBeVisible();
  await expect(eleve.getByRole("link", { name: "Faire le quiz du chapitre" })).toHaveCount(0);

  await page.goto("/referent");
  await page.getByRole("link", { name: /Quiz : Systèmes d'équations/ }).click();
  await expect(page.getByText("(bonne réponse)").first()).toBeVisible();
  await page.getByRole("button", { name: "Valider la version 1" }).click();
  await expect(page.locator(".erreur")).toContainText("Cochez la case");
  await page.getByLabel(/J'ai vérifié les points/).check();
  await page.getByRole("button", { name: "Valider la version 1" }).click();
  await expect(page.getByText("Statut : Validé")).toBeVisible();
  await expect(page.getByText(/Pas encore de statistiques/)).toBeVisible();

  // L'élève passe le quiz : questions sans les réponses, une seule tentative.
  await eleve.reload();
  await eleve.getByRole("link", { name: "Faire le quiz du chapitre" }).click();
  await expect(eleve.getByText("Question 1 : Combien font 2 + 2 ? (simulé)")).toBeVisible();
  await expect(eleve.getByText("2 + 2 = 4.")).toHaveCount(0);
  await eleve.getByLabel("4", { exact: true }).check();
  await eleve.getByLabel("Faux").check();
  await eleve.getByLabel("Ta réponse à la question 3").fill("3 × 4 = 12");
  await eleve.getByRole("button", { name: "Envoyer mes réponses" }).click();
  await expect(eleve.getByText("Ton score : 67 / 100 (enregistré).")).toBeVisible();
  await expect(eleve.getByText("Explication : 2 + 2 = 4.")).toBeVisible();
  await expect(eleve.getByRole("button", { name: "Envoyer mes réponses" })).toHaveCount(0);

  // Contestation de la question 2, deux fois : réexamen, puis transmission à un enseignant.
  const question2 = eleve.locator("section").filter({ hasText: "Question 2" });
  await question2.getByText("Je conteste cette correction").click();
  await question2.getByLabel("Explique pourquoi").fill("Je pense que c'est faux car…");
  await question2.getByRole("button", { name: "Envoyer ma contestation" }).click();
  await expect(question2.getByText("J'ai réexaminé ta réponse (simulé)").first()).toBeVisible();
  // Le panneau de contestation reste ouvert après le premier envoi.
  await question2.getByLabel("Explique pourquoi").fill("Je maintiens.");
  await question2.getByRole("button", { name: "Envoyer ma contestation" }).click();
  await expect(
    question2.getByText("Ta contestation a été transmise à un enseignant."),
  ).toBeVisible();
  await expect(eleve.getByText("Ton score : 67 / 100 (enregistré).")).toBeVisible();

  // Tentatives et contestations du quiz de CE chapitre (d'autres tests passent d'autres quiz).
  const traces = await executerSql(
    `with t as (select t.* from tentatives_quiz t join quiz q on q.id = t.quiz_id where q.chapitre_id = $1)
     select (select count(*)::int from t) as tentatives,
       (select score::int from t limit 1) as score,
       (select count(*)::int from contestations_quiz c join t on t.id = c.tentative_id) as contestations,
       (select count(*)::int from signalements where source = 'agent_evaluateur' and motif = 'erreur_contenu'
          and chapitre_id = $1) as signalements`,
    [chapitre.id],
  );
  expect(traces).toEqual([{ tentatives: 1, score: 67, contestations: 2, signalements: 1 }]);
  await eleve.close();
});

test("production vidéo (services simulés) : vidéo déposée « à relire » depuis le script validé ; script altéré refusé", async ({
  page,
}) => {
  const [script] = await executerSql(
    `select s.id, s.contenu::text as contenu from scripts s join chapitres c on c.id = s.chapitre_id
     where c.titre = 'Systèmes d''équations' and s.statut = 'valide'`,
  );
  await seConnecter(page, REFERENT);
  await page.goto(`/referent/scripts/${script.id}`);
  await page
    .getByRole("button", { name: /Lancer la production de la version 2 \(services simulés\)/ })
    .click();
  await expect(page.getByRole("status")).toContainText("Vidéo produite et déposée « à relire »");
  await expect(page.getByText(/déposée « à relire »,/)).toBeVisible();

  const videos = await executerSql(
    `select v.statut, v.script_version, v.script_empreinte = s.empreinte as meme_empreinte,
       v.reference_hebergement like 'simulation://%' as simulee, (v.rapport ->> 'resultat') as resultat
     from videos v join scripts s on s.id = v.script_id where s.id = '${script.id}'`,
  );
  expect(videos).toEqual([
    {
      statut: "a_relire",
      script_version: 2,
      meme_empreinte: true,
      simulee: true,
      resultat: "deposee",
    },
  ]);

  // Script altéré après validation (contournement simulé du verrou de la base) : la chaîne refuse.
  await executerSql(
    `alter table scripts disable trigger scripts_versionnes;
     update scripts set contenu = jsonb_set(contenu, '{sections,0,texte_parle}', '"Texte altéré."') where id = '${script.id}';
     alter table scripts enable trigger scripts_versionnes;`,
  );
  await page.reload();
  await page.getByRole("button", { name: /Lancer la production de la version 2/ }).click();
  await expect(page.locator(".erreur")).toContainText("Script modifié après sa validation");
  const journal = await executerSql(
    `select resultat, cout_usd::float as cout from journal_production_video
     where script_id = '${script.id}' order by cree_le`,
  );
  expect(journal.map((j) => j.resultat)).toEqual(["deposee", "refusee"]);
  expect(journal[1].cout).toBe(0);
  const [alerte] = await executerSql(
    "select count(*)::int as n from signalements where source = 'agent_production_video'",
  );
  expect(alerte.n).toBe(1);

  // Remise en état du contenu validé (mêmes données, même empreinte).
  await executerSql("alter table scripts disable trigger scripts_versionnes");
  await executerSql(`update scripts set contenu = $1::jsonb where id = '${script.id}'`, [
    script.contenu,
  ]);
  await executerSql("alter table scripts enable trigger scripts_versionnes");
  const [remis] = await executerSql(
    `select empreinte_jsonb(contenu) = empreinte as intact from scripts where id = '${script.id}'`,
  );
  expect(remis.intact).toBe(true);
});

test("vidéo : le référent la regarde, la valide, puis la publie ; l'élève la voit en faible débit avec sous-titres", async ({
  page,
}) => {
  await seConnecter(page, REFERENT);
  await page.goto("/referent");
  await expect(
    page.getByRole("heading", { name: "Vidéos à relire ou à publier (1)" }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Vidéo : Systèmes d'équations/ }).click();
  await expect(page.getByText("Statut : À relire")).toBeVisible();

  // Lecteur : rien n'est chargé avant la lecture, version la plus légère par défaut.
  const lecteur = page.locator("video");
  await expect(lecteur).toHaveAttribute("preload", "none");
  await expect(page.getByLabel("Qualité de la vidéo")).toHaveValue("0");
  await expect(page.getByLabel("Qualité de la vidéo").locator("option").first()).toHaveText(/240p/);

  // Validation : il faut confirmer avoir regardé toute la vidéo.
  await page.getByRole("button", { name: /Valider la version 2/ }).click();
  await expect(page.locator(".erreur")).toContainText("Cochez la case");
  await page.getByLabel(/J'ai regardé toute la vidéo/).check();
  await page.getByRole("button", { name: /Valider la version 2/ }).click();
  await expect(page.getByText("Statut : Validée (non publiée)")).toBeVisible();

  // Avant publication, l'élève ne voit pas la vidéo.
  const eleve = await page.context().browser()!.newPage();
  await seConnecter(eleve, "+999 000 001 01");
  await eleve.goto("/catalogue/ga-3e-mathematiques/systemes");
  await expect(eleve.getByText("La vidéo de ce chapitre n'est pas encore publiée.")).toBeVisible();

  // Publication : acte distinct, confirmé.
  await page.getByRole("button", { name: "Publier la vidéo pour les élèves" }).click();
  await expect(page.locator(".erreur")).toContainText("confirmer la publication");
  await page.getByLabel(/Je confirme la publication/).check();
  await page.getByRole("button", { name: "Publier la vidéo pour les élèves" }).click();
  await expect(page.getByText("Statut : Publiée")).toBeVisible();
  await expect(page.getByText(/Publiée par Prof fictif/)).toBeVisible();

  // L'élève regarde : la vidéo se lit vraiment, avec les sous-titres du texte validé.
  await eleve.reload();
  const video = eleve.locator("video");
  await expect(video).toBeVisible();
  await expect(eleve.getByText(/Vidéo simulée/)).toBeVisible();
  const lecture = await video.evaluate(async (v: HTMLVideoElement) => {
    v.muted = true;
    await v.play();
    await new Promise((fin) => setTimeout(fin, 700));
    return { temps: v.currentTime, pistes: v.textTracks.length };
  });
  expect(lecture.temps).toBeGreaterThan(0);
  expect(lecture.pistes).toBe(1);
  const piste = await eleve.locator("track").getAttribute("src");
  const reponse = await eleve.request.get(piste!);
  expect(reponse.status()).toBe(200);
  expect(await reponse.text()).toMatch(/^WEBVTT\n\n1\n00:00:00\.000 --> /);

  // Sans connexion, pas de sous-titres.
  const anonyme = await page.context().browser()!.newContext();
  expect((await anonyme.request.get(`http://localhost:3100${piste}`)).status()).toBe(401);
  await anonyme.close();
  await eleve.close();
});

test("Orchestrateur : agent suspendu, production mise en attente ; l'administration réactive et la tâche repart", async ({
  page,
}) => {
  await creerAdministrateurFictif("+999 000 003 01");
  await executerSql(
    "update etat_agents set suspendu = true, motif = 'Coût anormal (test)' where agent = 'production_video'",
  );
  const [script] = await executerSql(
    `select s.id from scripts s join chapitres c on c.id = s.chapitre_id
     where c.titre = 'Systèmes d''équations' and s.statut = 'valide'`,
  );
  await seConnecter(page, REFERENT);
  await page.goto(`/referent/scripts/${script.id}`);
  await page.getByRole("button", { name: /Lancer la production de la version 2/ }).click();
  await expect(page.locator(".erreur")).toContainText("Production en attente : Agent suspendu");

  // L'administration voit l'agent suspendu, la tâche en attente et la file humaine, puis réactive.
  const admin = await page.context().browser()!.newPage();
  await seConnecter(admin, "+999 000 003 01");
  await expect(admin).toHaveURL(/\/administration$/);
  await expect(
    admin.getByRole("listitem").filter({ hasText: /^production_video : suspendu —/ }),
  ).toBeVisible();
  await expect(
    admin.getByText(/production_video → production_video : suspendue \(agent\)/),
  ).toBeVisible();
  await expect(admin.getByRole("heading", { name: /File humaine/ })).toBeVisible();
  await reprendre(admin, "Réactiver production_video (reprise)", "Réactiver production_video");
  await expect(admin.getByText("production_video : actif")).toBeVisible();
  await expect(
    admin.getByText(/production_video → production_video : terminée/).first(),
  ).toBeVisible();

  const taches = await executerSql(
    `select statut, approbation_id is not null as approuvee from taches
     where type = 'production_video' order by cree_le desc limit 1`,
  );
  expect(taches).toEqual([{ statut: "terminee", approuvee: true }]);
  // Journal d'audit pseudonymisé : aucune trace de l'identifiant en clair.
  const audit = await executerSql(
    "select acteur, acteur_empreinte from journal_audit where action = 'journal_pilote_reprise_agent' and details->>'agent' = 'production_video'",
  );
  expect(audit).toHaveLength(1);
  expect(audit[0].acteur).toBe("administrateur");
  expect(audit[0].acteur_empreinte).toMatch(/^[0-9a-f]{16}$/);
  expect(audit[0].acteur_empreinte).not.toContain(identifiantSimule("+999 000 003 01").slice(0, 8));

  // Exécuteur planifié : jamais accessible sans le bon jeton.
  expect((await admin.request.post("/api/orchestrateur/executer")).status()).toBe(401);
  expect(
    (
      await admin.request.post("/api/orchestrateur/executer", {
        headers: { authorization: "Bearer mauvais-jeton-mauvais-jeton-mauvais-jeton" },
      })
    ).status(),
  ).toBe(401);
  // Un référent n'accède pas à l'administration.
  await page.goto("/administration");
  await expect(page).toHaveURL(/\/espace$|\/referent$/);
  await admin.close();
});
