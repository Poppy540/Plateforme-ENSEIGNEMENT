import { expect, test, type Page } from "@playwright/test";
import {
  creerAdministrateurFictif,
  executerSql,
  validerChapitresFictifs,
  seConnecter,
} from "../bout-en-bout/outils";

// Parcours de démonstration du Jalon 15, sur téléphone simulé, données FICTIVES : le tableau de bord du pilote
// dans ses quatre phases (préparation, en cours, terminé, clôturé), la liste « Ce qui vous attend » et le rapport
// de fin en cartes. Les phases sont posées directement en base pour la démonstration ; rien n'est effacé.
const DOSSIER = process.env.DOSSIER_CAPTURES_JALON_15 ?? "../docs/demo/jalon-15";
let numero = 0;
async function capture(page: Page, nom: string, pleinePage = true) {
  numero += 1;
  await page.screenshot({
    path: `${DOSSIER}/${String(numero).padStart(2, "0")}-${nom}.png`,
    fullPage: pleinePage,
  });
}

test.use({ locale: "fr-FR" });

const ADMIN = "+999 000 033 01";
const UNITE = "ga-3e-mathematiques";
const AGENTS = ["evaluateur", "professeur", "support", "tuteur"];

async function periode(debut: number, fin: number | null) {
  await executerSql(
    `insert into periode_pilote (debut, fin, maj_par)
     values (current_date + $1::int, case when $2::int is null then null else current_date + $2::int end, 'demo')
     on conflict (id) do update set debut = excluded.debut, fin = excluded.fin`,
    [debut, fin],
  );
}

test.afterAll(async () => {
  await executerSql("update etat_agents set suspendu = false, motif = null where agent = any($1)", [
    AGENTS,
  ]);
  await executerSql("update acces_eleves set ouvert = true, motif = null");
});

test("parcours complet du Jalon 15", async ({ page }) => {
  test.setTimeout(240_000);
  await creerAdministrateurFictif(ADMIN);
  await executerSql("delete from periode_pilote");

  // 1. Préparation : l'encadré en tête de l'administration, puis le tableau de bord.
  await seConnecter(page, ADMIN);
  await page.goto("/administration");
  await expect(page.getByRole("heading", { name: "Pilote : Préparation" })).toBeVisible();
  await capture(page, "administration-encadre-pilote", false);
  await page.getByRole("link", { name: "Voir le tableau de bord" }).click();
  await expect(
    page.getByRole("heading", { name: "Tableau de bord du pilote", level: 1 }),
  ).toBeVisible();
  await capture(page, "tableau-de-bord-preparation");

  // 2. Ce qui vous attend.
  await page.getByRole("link", { name: "Voir la liste complète →" }).click();
  await expect(page.getByRole("heading", { name: "Ce qui vous attend", level: 1 })).toBeVisible();
  await capture(page, "ce-qui-vous-attend");

  // 3. En cours : chapitre du pilote, 6 élèves fictifs actifs cette semaine.
  await validerChapitresFictifs(UNITE, 1);
  const quiz = await executerSql(
    `with chapitre as (
       select c.id from chapitres c join unites u on u.id = c.unite_id where u.code = $1 order by c.ordre limit 1
     ), pilote as (
       insert into chapitres_pilote (chapitre_id) select id from chapitre on conflict do nothing
     )
     insert into quiz (chapitre_id, version, questions, cree_par)
     select id, 1, '[{"enonce": "Question fictive"}]'::jsonb, 'demonstration' from chapitre
     returning id`,
    [UNITE],
  );
  await executerSql("update quiz set statut = 'valide' where id = $1", [quiz[0].id]);
  await executerSql(
    `with nouveaux as (
       select gen_random_uuid() as id, i from generate_series(1, 6) i
     ), comptes as (
       insert into auth.users (id) select id from nouveaux returning id
     ), profils_crees as (
       insert into profils (id, role, prenom_ou_pseudo, cree_le)
       select id, 'eleve', 'Élève fictif ' || i, now() - interval '20 days' from nouveaux returning id
     ), eleves_crees as (
       insert into eleves (id, referentiel_id, niveau_id, est_mineur, statut)
       select n.id, r.id, ni.id, true, 'actif' from nouveaux n, referentiels r, niveaux ni
       where r.code = 'ga-general' and ni.referentiel_id = r.id and ni.code = '3e' returning id
     )
     insert into tentatives_quiz (quiz_id, eleve_id, reponses, score, corrige_le)
     select $1, n.id, '[]'::jsonb, 50 + 5 * n.i, now() - (n.i % 4) * interval '1 day' from nouveaux n`,
    [quiz[0].id],
  );
  await periode(-14, 13);
  await page.goto("/administration/tableau-de-bord");
  await expect(page.getByText("Pilote en cours (étape actuelle)")).toBeVisible();
  await capture(page, "tableau-de-bord-en-cours");

  // 4. Terminé : la clôture commence.
  await periode(-28, -1);
  await page.reload();
  await expect(page.getByText("Pilote terminé, clôture en cours (étape actuelle)")).toBeVisible();
  await capture(page, "tableau-de-bord-termine");

  // 5. Rapport de fin sur téléphone : une carte par indicateur.
  await page.goto("/administration/fin-pilote");
  const cartes = page.getByRole("list", { name: /Cartes — 1\. Les élèves/ });
  await expect(cartes).toBeVisible();
  await cartes.evaluate((e) => e.scrollIntoView({ block: "start" }));
  await capture(page, "rapport-fin-cartes-telephone", false);

  // 6. Clôturé : les 8 gestes faits (posés en base pour la démonstration), puis le sort des données.
  await executerSql(
    `insert into journal_audit (acteur, action, objet_type, details)
     values ('administrateur', 'rapport_fin_telecharge', 'pilote', '{"version": "equipe"}')`,
  );
  await executerSql(
    `insert into journal_pilote (type, texte, cree_par)
     values ('decision_finale', 'Arrêter le pilote : fin prévue de l''essai (fictif)', 'demo')`,
  );
  await executerSql(
    `insert into gestes_cloture (geste, preuve, date_preuve, cochee_par)
     select g, 'Preuve fictive de démonstration', current_date, 'demo'
     from unnest(array['questionnaires_fin', 'reunion_bilan', 'familles_informees', 'derniere_sauvegarde']) g
     on conflict (geste) do nothing`,
  );
  await executerSql("update acces_eleves set ouvert = false, motif = 'Fin du pilote (fictif)'");
  await executerSql(
    "update etat_agents set suspendu = true, motif = 'Fin du pilote (fictif)' where agent = any($1)",
    [AGENTS],
  );
  await page.goto("/administration/tableau-de-bord");
  await expect(page.getByText("Pilote clôturé (étape actuelle)")).toBeVisible();
  await capture(page, "tableau-de-bord-cloture");
});
