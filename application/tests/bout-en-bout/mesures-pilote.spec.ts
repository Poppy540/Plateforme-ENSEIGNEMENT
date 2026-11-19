import { expect, test } from "@playwright/test";
import {
  creerAdministrateurFictif,
  executerSql,
  seConnecter,
  validerChapitresFictifs,
} from "./outils";

// Mesures du pilote (Jalon 6, étape 5 ; ADR 0052) : compteur de lecture agrégé et questionnaire anonyme, sur le
// pays FICTIF « zz » (questionnaire fictif validé ; celui du pilote attend la validation du propriétaire).
test.describe.configure({ mode: "serial" });

const ELEVE = "+999 000 009 01";
const ADMIN = "+999 000 009 02";

test.beforeAll(async () => {
  await validerChapitresFictifs("zz-an3-mathematiques", 1);
  // Script FICTIF validé (statut, version, empreinte) : la leçon écrite s'ouvre, faute de vidéo.
  const [script] = await executerSql(
    `insert into scripts (chapitre_id, contenu, duree_cible_minutes, cree_par)
     select c.id, $1::jsonb, 8, 'test' from chapitres c join unites u on u.id = c.unite_id
     where u.code = 'zz-an3-mathematiques' order by c.ordre limit 1
     returning id`,
    [
      JSON.stringify({
        sections: [
          {
            type: "accroche",
            titre: "Fictif",
            debut_secondes: 0,
            duree_secondes: 30,
            texte_parle: "Texte fictif de la leçon du pays Z.",
            indications_visuelles: "",
          },
        ],
        glossaire: [],
        travaux_pratiques: { consignes: [], materiel: [], securite: [] },
      }),
    ],
  );
  await executerSql("update scripts set statut = 'valide' where id = $1", [script.id]);
  await executerSql(
    `insert into approbations (objet_type, objet_id, version, empreinte, decision, valideur_id)
     select 'script', id, version, empreinte, 'valide', '99999999-9999-4999-8999-999999999999'
     from scripts where id = $1`,
    [script.id],
  );
});

test("l'élève répond une fois au questionnaire anonyme ; la leçon ouverte est comptée sans lui", async ({
  page,
}) => {
  await seConnecter(page, ELEVE);
  await page.getByLabel("Ton prénom ou un pseudonyme").fill("Élève fictif mesures");
  await page.getByLabel("Pays et programme").selectOption({ value: "zz-general" });
  await page.getByLabel("Ta classe").selectOption({ label: "Année 3" });
  await page.getByLabel("J'ai 16 ans ou plus").check();
  await page.getByRole("button", { name: "M'inscrire" }).click();
  await expect(page).toHaveURL(/\/espace$/);

  await page.getByRole("link", { name: "Donne ton avis (questionnaire anonyme)" }).click();
  await expect(page.getByText("tes réponses ne sont pas rattachées à ton compte")).toBeVisible();
  await page.getByLabel("4 — Plutôt oui").check();
  await page.getByLabel("Option A").check();
  await page.getByRole("button", { name: "Envoyer mes réponses" }).click();
  await expect(page.getByRole("status")).toContainText("Merci pour tes réponses");
  await page.goto("/espace");
  await expect(page.getByRole("link", { name: /Donne ton avis/ })).toHaveCount(0);
  const [r] = await executerSql(
    'select count(*)::int as n, bool_and(reponses = \'{"e1": "4", "e2": "Option A"}\'::jsonb) as ok from reponses_questionnaire',
  );
  expect(r).toEqual({ n: 1, ok: true });

  // Leçon écrite ouverte d'emblée (pas de vidéo) : comptée une fois pour le chapitre et le jour.
  await page.goto("/catalogue/zz-an3-mathematiques");
  await page.locator(".chapitres a").first().click();
  await expect(page.locator("details.lecon")).toContainText("Texte fictif de la leçon du pays Z");
  await expect
    .poll(async () => {
      const [v] = await executerSql(
        `select coalesce(sum(lecons_ouvertes), 0)::int as n from visionnages_jour v
         join chapitres c on c.id = v.chapitre_id join unites u on u.id = c.unite_id
         where u.code = 'zz-an3-mathematiques'`,
      );
      return v.n;
    })
    .toBe(1);
});

test("l'administration voit des totaux masqués, jamais un élève", async ({ page }) => {
  await creerAdministrateurFictif(ADMIN);
  await seConnecter(page, ADMIN);
  await page.goto("/administration/exploitation");
  const ligne = page.getByRole("row").filter({ hasText: "zz-an3-mathematiques" });
  await expect(ligne).toContainText("<5");
  await expect(page.getByText("Pas encore assez de réponses")).toBeVisible();
  const visionnages = await page.request.get("/api/administration/export?type=visionnages");
  expect(visionnages.status()).toBe(200);
  expect(await visionnages.text()).toContain("zz-an3-mathematiques");
  const questionnaire = await (
    await page.request.get("/api/administration/export?type=questionnaire")
  ).text();
  // Une seule réponse : le groupe reste sous le seuil, rien n'est exporté au-delà de l'en-tête.
  expect(questionnaire.trim().split("\n")).toHaveLength(1);
});
