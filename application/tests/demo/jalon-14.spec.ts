import { expect, test, type Page } from "@playwright/test";
import {
  creerAdministrateurFictif,
  executerSql,
  seConnecter,
  validerChapitresFictifs,
} from "../bout-en-bout/outils";

// Parcours de démonstration du Jalon 14 : un pilote FICTIF de 4 semaines, sur téléphone simulé, de la saisie de
// sa période à la clôture : rapport de fin (équipe et établissement), décision d'arrêt, mise en veille, gestes
// de clôture, puis la simulation du sort des données. Aucun élève réel ; rien n'est effacé.
const DOSSIER = process.env.DOSSIER_CAPTURES_JALON_14 ?? "../docs/demo/jalon-14";
let numero = 0;
async function capture(page: Page, nom: string, pleinePage = true) {
  numero += 1;
  await page.screenshot({
    path: `${DOSSIER}/${String(numero).padStart(2, "0")}-${nom}.png`,
    fullPage: pleinePage,
  });
}

test.use({ locale: "fr-FR" });

const ADMIN = "+999 000 030 01";
const UNITE = "ga-3e-mathematiques";
const AGENTS = ["evaluateur", "professeur", "support", "tuteur"];
const jourIso = (decalage: number) =>
  new Date(Date.now() + decalage * 86_400_000).toISOString().slice(0, 10);
const geste = (page: Page, code: string) => page.locator(`#geste-${code}`);

test.afterAll(async () => {
  // La démonstration remet la plateforme en service (base locale de démonstration).
  await executerSql("update etat_agents set suspendu = false, motif = null where agent = any($1)", [
    AGENTS,
  ]);
  await executerSql("update acces_eleves set ouvert = true, motif = null");
});

test("parcours complet du Jalon 14", async ({ page }) => {
  test.setTimeout(240_000);
  await creerAdministrateurFictif(ADMIN);

  // Données FICTIVES : un chapitre du pilote et son quiz ; 10 élèves fictifs actifs sur 4 semaines (2 à 8 par
  // semaine), des chapitres terminés, des vidéos vues, des coûts, deux signalements traités.
  await validerChapitresFictifs(UNITE, 1);
  // Un quiz fictif par semaine (un élève ne passe qu'une fois un même quiz ; la base numérote les versions).
  const quiz = await executerSql(
    `with chapitre as (
       select c.id from chapitres c join unites u on u.id = c.unite_id where u.code = $1 order by c.ordre limit 1
     ), pilote as (
       insert into chapitres_pilote (chapitre_id) select id from chapitre on conflict do nothing
     )
     insert into quiz (chapitre_id, version, questions, cree_par)
     select id, 1 + v, '[{"enonce": "Question fictive"}]'::jsonb, 'demonstration' from chapitre, generate_series(0, 3) v
     returning id, chapitre_id, version`,
    [UNITE],
  );
  await executerSql("update quiz set statut = 'valide' where id = any($1::uuid[])", [
    quiz.map((q) => q.id),
  ]);
  const chapitre = quiz[0].chapitre_id;
  await executerSql(
    `with nouveaux as (
       select gen_random_uuid() as id, i from generate_series(1, 10) i
     ), comptes as (
       insert into auth.users (id) select id from nouveaux returning id
     ), profils_crees as (
       insert into profils (id, role, prenom_ou_pseudo, cree_le, derniere_activite)
       select id, 'eleve', 'Élève fictif du pilote ' || i, now() - interval '35 days', now() - interval '2 days'
       from nouveaux returning id
     ), eleves_crees as (
       insert into eleves (id, referentiel_id, niveau_id, est_mineur, statut)
       select n.id, r.id, ni.id, true, 'actif' from nouveaux n, referentiels r, niveaux ni
       where r.code = 'ga-general' and ni.referentiel_id = r.id and ni.code = '3e' returning id
     ), tentatives as (
       -- Semaine 1 : élèves 1 à 2 ; semaine 2 : 1 à 6 ; semaine 3 : 1 à 8 ; semaine 4 : 1 à 7.
       insert into tentatives_quiz (quiz_id, eleve_id, reponses, score, corrige_le)
       select q.id, n.id, '[]'::jsonb, 45 + 4 * n.i, now() - (s.j * 7 + 3) * interval '1 day'
       from nouveaux n, (values (3, 2), (2, 6), (1, 8), (0, 7)) s(j, nombre), quiz q
       where n.i <= s.nombre and q.id = ($2::uuid[])[s.j + 1]
     )
     insert into progression (eleve_id, chapitre_id, statut, maj_le)
     select n.id, $1, 'termine', now() - interval '9 days' from nouveaux n where n.i <= 7`,
    [chapitre, quiz.map((q) => q.id)],
  );
  await executerSql(
    `insert into visionnages_jour (chapitre_id, jour, videos_demarrees, videos_terminees, lecons_ouvertes)
     select $1, current_date - (s.j * 7 + 3), s.d, s.t, s.l
     from (values (3, 4, 2, 1), (2, 11, 8, 5), (1, 15, 12, 6), (0, 12, 10, 4)) s(j, d, t, l)
     on conflict (chapitre_id, jour) do update set videos_demarrees = excluded.videos_demarrees`,
    [chapitre],
  );
  await executerSql(
    `insert into consommation_agents (agent, jour, cout_usd)
     select 'professeur', current_date - (s.j * 7 + 3), s.c from (values (3, 0.8), (2, 2.1), (1, 2.9), (0, 2.4)) s(j, c)
     on conflict (agent, jour) do update set cout_usd = excluded.cout_usd`,
  );
  await executerSql(
    `insert into signalements (source, motif, priorite, resume, cree_le, traite_le) values
       ('agent_professeur', 'hors_programme', 2, 'Question hors programme (fictif)', now() - interval '20 days', now() - interval '19 days'),
       ('agent_evaluateur', 'erreur_contenu', 2, 'Erreur de corrigé signalée (fictif)', now() - interval '12 days', now() - interval '11 days')`,
  );

  // 1. Période du pilote : 4 semaines, terminées hier.
  await seConnecter(page, ADMIN);
  await page.goto("/administration/fin-pilote");
  await page.getByLabel("Premier jour du pilote").fill(jourIso(-28));
  await page.getByLabel(/Dernier jour/).fill(jourIso(-1));
  await capture(page, "periode-du-pilote", false);
  await page.getByRole("button", { name: "Enregistrer la période" }).click();
  await expect(page.getByRole("status")).toContainText("Période du pilote enregistrée");

  // 2. Rapport de fin : version équipe, puis version établissement.
  await page.reload();
  await capture(page, "rapport-fin-version-equipe");
  await page.goto("/administration/fin-pilote?version=etablissement");
  await expect(page.getByText("version pour l'établissement")).toBeVisible();
  await capture(page, "rapport-fin-version-etablissement");
  // Téléchargement du rapport depuis la plateforme, noté pour la clôture.
  const telechargement = await page.request.get("/api/administration/fin-pilote?version=equipe", {
    headers: { "sec-fetch-site": "same-origin" },
  });
  expect(telechargement.status()).toBe(200);

  // 3. Clôture : décision d'arrêt ; la mise en veille reste à faire.
  await page.goto("/administration/cloture");
  await geste(page, "decision_finale").getByText("Noter la décision finale").click();
  await page.getByLabel("Décision").selectOption("arreter");
  await page
    .getByLabel(/^Motif/)
    .fill("Fin prévue de l'essai ; bilan positif, reprise envisagée à la rentrée (fictif).");
  await page.getByRole("button", { name: "Noter la décision" }).click();
  await expect(page.getByRole("status")).toContainText("Décision finale notée");
  await geste(page, "decision_finale").scrollIntoViewIfNeeded();
  await capture(page, "cloture-decision-arret-mise-en-veille-a-faire", false);

  // 4. Mise en veille (boutons de l'administration ; agents suspendus ici en une fois pour la démonstration),
  //    puis les gestes cochés avec leur preuve.
  await page.goto("/administration");
  await page
    .getByLabel("Motif (interne, jamais montré aux élèves)")
    .fill("Fin du pilote (démonstration fictive)");
  await page.getByRole("button", { name: "Fermer l'accès des élèves" }).click();
  await expect(page.getByRole("status").first()).toContainText("fermé");
  await executerSql(
    "update etat_agents set suspendu = true, motif = 'Fin du pilote (fictif)' where agent = any($1)",
    [AGENTS],
  );
  await page.goto("/administration/cloture");
  for (const [code, preuve] of [
    ["questionnaires_fin", "Ouverts la dernière semaine, fermés hier ; 14 réponses (fictif)"],
    ["reunion_bilan", "Réunion tenue avec l'établissement ; compte rendu au dossier (fictif)"],
    ["familles_informees", "Message approuvé envoyé par SMS aux familles (fictif)"],
    ["derniere_sauvegarde", "Sauvegarde du jour, restauration essayée sur une base vide (fictif)"],
  ]) {
    await geste(page, code).getByText("Cocher avec une preuve").click();
    await geste(page, code)
      .getByLabel(/Preuve/)
      .fill(preuve);
    await geste(page, code).getByLabel("Date de la preuve").fill(jourIso(0));
    await geste(page, code).getByRole("button", { name: "Cocher ce geste" }).click();
    await expect(page.getByRole("status")).toContainText("Geste coché");
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.getByText("8 / 8 gestes faits")).toBeVisible();
  await capture(page, "cloture-complete");

  // 5. Sort des données : simulation selon les durées du pack (rien n'est effacé).
  await page.goto("/administration/donnees");
  await expect(page.getByText("Simulation seulement : rien n'est effacé ici.")).toBeVisible();
  await capture(page, "sort-des-donnees-simulation");
});
