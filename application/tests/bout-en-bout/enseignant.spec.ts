import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { classeEnSql, empreinteCode } from "../../src/lib/invitation";
import { executerSql, inscrireEleveActif, seConnecter, validerChapitresFictifs } from "./outils";

// Classe du pilote et vue de l'enseignant (Jalon 9, étape 2 ; ADR 0063) : chiffres agrégés seulement, masqués
// sous 5 élèves. Données fictives ; codes de TEST.
test.describe.configure({ mode: "serial" });

const ENSEIGNANT = "+999 000 015 01";
const ELEVE = "+999 000 015 02";
const CODE_CLASSE = "TEST-CLAS-E2E1";
const CODE_ENSEIGNANT = "TEST-ENSE-E2E1";
const NOM = "3e fictive A";

async function auditer(page: Page, nom: string) {
  const resultat = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
    .analyze();
  const violations = resultat.violations.map((v) => `${nom} — ${v.id} : ${v.help}`);
  expect.soft(violations, violations.join("\n")).toEqual([]);
}

test("le propriétaire crée la classe ; l'enseignant active son accès et ne voit rien sous 5 élèves", async ({
  page,
}) => {
  await validerChapitresFictifs("ga-3e-mathematiques", 2);
  // Même SQL que « pnpm classe:creer », avec des codes de test connus.
  await executerSql(
    classeEnSql({
      referentiel: "ga-general",
      niveau: "3e",
      serie: null,
      nom: NOM,
      etablissement: "Collège fictif",
      empreinteClasse: empreinteCode(CODE_CLASSE),
      empreinteEnseignant: empreinteCode(CODE_ENSEIGNANT),
      joursCodeClasse: 30,
      joursInvitation: 1,
    }),
  );

  await seConnecter(page, ENSEIGNANT);
  await page.goto("/enseignant/activer");
  await page.getByLabel("Votre prénom ou un pseudonyme").fill("Enseignant fictif");
  await page.getByLabel("Code d'invitation").fill(CODE_ENSEIGNANT);
  await page.getByRole("button", { name: "Activer mon accès" }).click();
  await expect(page).toHaveURL(/\/enseignant$/);
  await expect(page.getByRole("heading", { name: new RegExp(NOM) })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("dès que 5 élèves au moins");
  await auditer(page, "enseignant, classe masquée");
  // Un enseignant qui revient passe par son espace.
  await page.goto("/espace");
  await expect(page).toHaveURL(/\/enseignant$/);
});

test("l'élève rejoint sa classe avec le code, puis peut la quitter", async ({ page }) => {
  await inscrireEleveActif(page, ELEVE, "3e");
  await page.goto("/espace");
  await page.getByLabel(/Code de ta classe/).fill("MAUV-AISC-ODE0");
  await page.getByRole("button", { name: "Rejoindre ma classe" }).click();
  await expect(page.locator(".erreur")).toContainText("Code de classe inconnu");
  await page.getByLabel(/Code de ta classe/).fill(CODE_CLASSE.toLowerCase());
  await page.getByRole("button", { name: "Rejoindre ma classe" }).click();
  await expect(page.getByText(`Tu fais partie de la classe ${NOM}`)).toBeVisible();
  await auditer(page, "espace élève avec sa classe");
  await page.getByRole("button", { name: "Quitter cette classe" }).click();
  await expect(page.getByLabel(/Code de ta classe/)).toBeVisible();
  await page.getByLabel(/Code de ta classe/).fill(CODE_CLASSE);
  await page.getByRole("button", { name: "Rejoindre ma classe" }).click();
  await expect(page.getByText(`Tu fais partie de la classe ${NOM}`)).toBeVisible();
});

test("à partir de 5 élèves, l'enseignant voit l'avancement agrégé, sans aucun nom", async ({
  page,
}) => {
  // Cinq autres élèves FICTIFS de la classe, ayant terminé le premier chapitre validé.
  await executerSql(
    `with nouveaux as (
       select gen_random_uuid() as id, i from generate_series(1, 5) i
     ), comptes as (
       insert into auth.users (id) select id from nouveaux returning id
     ), profils_crees as (
       insert into profils (id, role, prenom_ou_pseudo, derniere_activite)
       select id, 'eleve', 'Élève fictif de classe ' || i, now() from nouveaux returning id
     ), classe as (
       select c.id, c.referentiel_id, c.niveau_id from classes c where c.nom = $1
     ), eleves_crees as (
       insert into eleves (id, referentiel_id, niveau_id, est_mineur, statut, classe_id)
       select n.id, c.referentiel_id, c.niveau_id, true, 'actif', c.id from nouveaux n, classe c
       returning id
     )
     insert into progression (eleve_id, chapitre_id, statut)
     select e.id, (select ch.id from chapitres ch join unites u on u.id = ch.unite_id
                   where u.code = 'ga-3e-mathematiques' and ch.statut = 'valide' order by ch.ordre limit 1),
            'termine'
     from eleves_crees e`,
    [NOM],
  );

  await seConnecter(page, ENSEIGNANT);
  await expect(page).toHaveURL(/\/enseignant$/);
  await expect(page.getByText("Élèves inscrits dans la classe : 6")).toBeVisible();
  const tableau = page.getByRole("list", { name: `Avancement de la classe ${NOM}` });
  await expect(tableau).toBeVisible();
  // Premier chapitre : 5 élèves l'ont terminé (deuxième chiffre de la carte).
  await expect(tableau.getByRole("listitem").first().getByRole("definition").nth(1)).toHaveText(
    "5",
  );
  await expect(page.locator("main")).not.toContainText("Élève fictif");
  await expect(page.locator("main")).not.toContainText("+999");
  await auditer(page, "enseignant, tableau de la classe");
});

test("au-delà de 10 essais de code de classe dans la journée, la saisie est refusée (revue du Jalon 16, S1)", async ({
  page,
}) => {
  await inscrireEleveActif(page, "+999 000 015 09", "3e");
  await page.goto("/espace");
  for (let i = 0; i < 10; i++) {
    await page.getByLabel(/Code de ta classe/).fill(`FAUX-CODE-${String(i).padStart(4, "0")}`);
    // Attendre la réponse du serveur à chaque essai : chacun doit être compté.
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST"),
      page.getByRole("button", { name: "Rejoindre ma classe" }).click(),
    ]);
    await expect(page.locator(".erreur")).toContainText("Code de classe inconnu");
  }
  // Même le bon code est refusé jusqu'au lendemain ; le code saisi n'est gardé nulle part.
  await page.getByLabel(/Code de ta classe/).fill(CODE_CLASSE);
  await page.getByRole("button", { name: "Rejoindre ma classe" }).click();
  await expect(page.locator(".erreur")).toContainText("Trop d'essais de code aujourd'hui");
  const traces = await executerSql(
    "select count(*)::int as n from limites_connexion where cle like '%FAUX%' or cle like '%TEST-CLAS%'",
  );
  expect(traces[0].n).toBe(0);
});
