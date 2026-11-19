import { expect, test, type Page } from "@playwright/test";
import { classeEnSql, empreinteCode } from "../../src/lib/invitation";
import {
  executerSql,
  inscrireEleveActif,
  seConnecter,
  validerChapitresFictifs,
} from "../bout-en-bout/outils";

// Parcours de démonstration du Jalon 9 (agents simulés), sur téléphone simulé, données fictives : texte de l'élève
// masqué avant le Professeur, classe du pilote rejointe par l'élève, vue agrégée de l'enseignant.
const DOSSIER = process.env.DOSSIER_CAPTURES_JALON_9 ?? "../docs/demo/jalon-9";
let numero = 0;
async function capture(page: Page, nom: string, pleinePage = true) {
  numero += 1;
  await page.screenshot({
    path: `${DOSSIER}/${String(numero).padStart(2, "0")}-${nom}.png`,
    fullPage: pleinePage,
  });
}

const ELEVE = "+999 000 016 01";
const ENSEIGNANT = "+999 000 016 02";
const CODE_CLASSE = "DEMO-CLAS-0009";
const CODE_ENSEIGNANT = "DEMO-ENSE-0009";
const NOM = "3e B (fictive)";

test("parcours complet du Jalon 9", async ({ page }) => {
  test.setTimeout(240_000);
  await validerChapitresFictifs("ga-3e-mathematiques", 3);
  await executerSql(
    classeEnSql({
      referentiel: "ga-general",
      niveau: "3e",
      serie: null,
      nom: NOM,
      etablissement: "Collège fictif de démonstration",
      empreinteClasse: empreinteCode(CODE_CLASSE),
      empreinteEnseignant: empreinteCode(CODE_ENSEIGNANT),
      joursCodeClasse: 30,
      joursInvitation: 1,
    }),
  );

  // 1. Élève : question au Professeur avec un numéro fictif, masqué avant l'envoi.
  await inscrireEleveActif(page, ELEVE, "3e");
  await page.goto("/catalogue/ga-3e-mathematiques");
  await page.getByRole("link", { name: "Théorème de Thalès" }).click();
  await page
    .getByLabel("Ta question")
    .fill("Dans mon exercice AM = 3 et AB = 12. Tu peux m'appeler au +999 77 12 34 56 ?");
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByRole("button", { name: "Envoyer" })).toBeEnabled();
  await page.reload();
  await expect(page.locator(".echange-eleve").last()).toContainText("[numéro masqué]");
  await page.locator(".echange-eleve").last().scrollIntoViewIfNeeded();
  await capture(page, "question-numero-masque", false);

  // 2. Élève : rejoindre sa classe avec le code de l'enseignant.
  await page.goto("/espace");
  await capture(page, "espace-eleve-ma-classe");
  await page.getByLabel(/Code de ta classe/).fill(CODE_CLASSE);
  await page.getByRole("button", { name: "Rejoindre ma classe" }).click();
  await expect(page.getByText(`Tu fais partie de la classe ${NOM}`)).toBeVisible();
  await capture(page, "eleve-a-rejoint-sa-classe");

  // 3. Enseignant : activation, puis classe encore masquée (moins de 5 élèves).
  await page.context().clearCookies();
  await seConnecter(page, ENSEIGNANT);
  await page.goto("/enseignant/activer");
  await page.getByLabel("Votre prénom ou un pseudonyme").fill("Enseignant fictif");
  await page.getByLabel("Code d'invitation").fill(CODE_ENSEIGNANT);
  await capture(page, "enseignant-activation", false);
  await page.getByRole("button", { name: "Activer mon accès" }).click();
  await expect(page).toHaveURL(/\/enseignant$/);
  await capture(page, "enseignant-classe-masquee-moins-de-5");

  // 4. Huit autres élèves FICTIFS : avancement et quiz, pour que les chiffres d'ensemble apparaissent.
  await executerSql(
    `with nouveaux as (
       select gen_random_uuid() as id, i from generate_series(1, 8) i
     ), comptes as (
       insert into auth.users (id) select id from nouveaux returning id
     ), profils_crees as (
       insert into profils (id, role, prenom_ou_pseudo, derniere_activite)
       select id, 'eleve', 'Élève fictif de démonstration ' || i, now() - (i % 3) * interval '4 days' from nouveaux
       returning id
     ), classe as (
       select id, referentiel_id, niveau_id from classes where nom = $1
     ), eleves_crees as (
       insert into eleves (id, referentiel_id, niveau_id, est_mineur, statut, classe_id)
       select n.id, c.referentiel_id, c.niveau_id, true, 'actif', c.id from nouveaux n, classe c returning id
     ), chapitres_valides as (
       select ch.id, ch.ordre from chapitres ch join unites u on u.id = ch.unite_id
       where u.code = 'ga-3e-mathematiques' and ch.statut = 'valide' order by ch.ordre limit 2
     )
     insert into progression (eleve_id, chapitre_id, statut)
     select n.id, cv.id,
            (case when cv.ordre = (select min(ordre) from chapitres_valides) and n.i <= 6 then 'termine'
                  else 'en_cours' end)::statut_progression
     from nouveaux n cross join chapitres_valides cv
     where cv.ordre = (select min(ordre) from chapitres_valides) or n.i <= 5`,
    [NOM],
  );
  const [quiz] = await executerSql(
    `insert into quiz (chapitre_id, questions, cree_par)
     select ch.id, $1::jsonb, 'agent_evaluateur' from chapitres ch join unites u on u.id = ch.unite_id
     where u.code = 'ga-3e-mathematiques' and ch.code = 'thales' returning id`,
    [
      JSON.stringify([
        { enonce: "Question fictive 1", notion: "Écrire l'égalité des rapports" },
        { enonce: "Question fictive 2", notion: "Calculer une longueur" },
      ]),
    ],
  );
  await executerSql("update quiz set statut = 'valide' where id = $1", [quiz.id]);
  await executerSql(
    `insert into tentatives_quiz (quiz_id, eleve_id, reponses, score)
     select $1, e.id,
       jsonb_build_array(
         jsonb_build_object('question', 0, 'correction', jsonb_build_object('resultat',
           case when row_number() over (order by e.id) <= 6 then 'faux' else 'juste' end)),
         jsonb_build_object('question', 1, 'correction', jsonb_build_object('resultat', 'juste'))),
       case when row_number() over (order by e.id) <= 6 then 50 else 100 end
     from eleves e join classes c on c.id = e.classe_id where c.nom = $2`,
    [quiz.id, NOM],
  );

  // 5. Enseignant : chiffres d'ensemble, aucun nom.
  await page.reload();
  await expect(page.getByRole("list", { name: `Avancement de la classe ${NOM}` })).toBeVisible();
  await expect(page.locator("main")).not.toContainText("Élève fictif");
  await capture(page, "enseignant-tableau-de-la-classe");
});
