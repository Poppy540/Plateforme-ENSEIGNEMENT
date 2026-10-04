import { expect, type Page } from "@playwright/test";
import { Client } from "pg";

// Outils des tests de bout en bout : base locale de test (données fictives uniquement).
export async function executerSql(sql: string, valeurs: unknown[] = []) {
  const client = new Client({ connectionString: "postgresql://postgres@127.0.0.1:54330/postgres" });
  await client.connect();
  try {
    return (await client.query(sql, valeurs)).rows;
  } finally {
    await client.end();
  }
}

/** Valide des chapitres d'une unité au nom d'un référent fictif, comme le ferait l'espace référent. */
export async function validerChapitresFictifs(codeUnite: string, nombre: number) {
  await executerSql(
    `insert into auth.users (id) values ('99999999-9999-4999-8999-999999999999') on conflict do nothing;
     insert into profils (id, role, prenom_ou_pseudo)
       values ('99999999-9999-4999-8999-999999999999', 'referent', 'Référent fictif') on conflict do nothing;`,
  );
  await executerSql(
    `with choisis as (
       select c.id, c.version, c.empreinte from chapitres c join unites u on u.id = c.unite_id
       where u.code = $1 order by c.ordre limit $2
     ), traces as (
       insert into approbations (objet_type, objet_id, version, empreinte, decision, commentaire, valideur_id)
       select 'chapitre', id, version, empreinte, 'valide', 'Test fictif', '99999999-9999-4999-8999-999999999999' from choisis
     )
     update chapitres set statut = 'valide' where id in (select id from choisis)`,
    [codeUnite, nombre],
  );
}

export async function seConnecter(page: Page, numero: string) {
  await page.goto("/connexion");
  await page.getByLabel("Ton numéro de téléphone").fill(numero);
  await page.getByRole("button", { name: "Recevoir un code" }).click();
  await expect(page.getByRole("heading", { name: "Entre ton code" })).toBeVisible();
  await page.getByLabel("Code reçu").fill("123456");
  await page.getByRole("button", { name: "Valider" }).click();
  // Un référent passe par /espace puis est redirigé vers /referent : les deux sont acceptés.
  await expect(page).toHaveURL(/\/(espace|inscription|referent)$/);
}

/** Connexion, inscription et accord du parent (par la boîte de messages simulée). */
export async function inscrireEleveActif(
  page: Page,
  numero: string,
  classe: string,
  serie?: string,
) {
  await seConnecter(page, numero);
  await expect(page).toHaveURL(/\/inscription$/);
  await page.getByLabel("Ton prénom ou un pseudonyme").fill("Élève fictif");
  await page.getByLabel("Ta classe").selectOption({ label: classe });
  if (serie) await page.getByLabel("Ta série").selectOption({ value: serie });
  const contactParent = `+999 111 ${numero.replace(/\D/g, "").slice(-6)}`;
  await page.getByLabel("Numéro ou email d'un parent ou tuteur").fill(contactParent);
  await page.getByRole("button", { name: "M'inscrire" }).click();
  await expect(page).toHaveURL(/\/espace$/);

  await page.goto("/developpement/messages");
  const texte = await page
    .locator(".messages li")
    .filter({ hasText: contactParent.replace(/\s/g, "") })
    .first()
    .innerText();
  const lien = texte.match(/https?:\/\/\S+\/parent\/confirmer\?jeton=[0-9a-f]+/)![0];
  await page.goto(lien);
  await page.getByRole("button", { name: "J'accepte l'inscription" }).click();
  await expect(page.getByRole("status")).toContainText("inscription est acceptée");
}

/** Invitation de référent fictive avec un code connu (le script réel génère un code aléatoire). */
export async function creerInvitationFictive(code: string, familles: string[]) {
  await executerSql(
    `insert into invitations_referents (empreinte_code, referentiel_id, familles, expire_le)
     select encode(sha256(convert_to($1, 'UTF8')), 'hex'), id, $2::text[], now() + interval '1 day'
     from referentiels where code = 'ga-general'
     on conflict (empreinte_code) do nothing`,
    [code, familles],
  );
}
