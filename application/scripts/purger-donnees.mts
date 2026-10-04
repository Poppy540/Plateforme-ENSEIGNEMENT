// Purge des données selon les durées de conservation de chaque pack pays (ADR 0019).
// À lancer par l'administration (tâche planifiée), jamais par un agent.
//   pnpm donnees:purger                 simulation : affiche ce qui serait effacé, puis annule tout
//   pnpm donnees:purger --confirmer     efface réellement (irréversible)
// Variables : URL_BASE_DONNEES_ADMIN (connexion d'administration), MODE_AUTH, et en production
// URL_SUPABASE + CLE_SERVICE_SUPABASE pour supprimer les comptes d'authentification.
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const confirmer = process.argv.includes("--confirmer");
const url = process.env.URL_BASE_DONNEES_ADMIN;
if (!url) {
  console.error("URL_BASE_DONNEES_ADMIN manquante.");
  process.exit(2);
}
const simulation = process.env.MODE_AUTH === "simulation";
const client = new pg.Client({ connectionString: url });
await client.connect();

try {
  await client.query("begin");
  const pays = (await client.query("select code from pays order by code")).rows.map(
    (r) => r.code as string,
  );
  const comptes: string[] = [];
  for (const code of pays) {
    const avant = (await client.query("select count(*)::int as n from echanges_professeur")).rows[0]
      .n;
    const designes = (
      await client.query("select compte from purger_donnees_expirees($1)", [code])
    ).rows.map((r) => r.compte as string);
    const apres = (await client.query("select count(*)::int as n from echanges_professeur")).rows[0]
      .n;
    console.log(
      `${code} : ${avant - apres} échange(s) expiré(s), ${designes.length} compte(s) à supprimer.`,
    );
    comptes.push(...designes);
  }

  if (!confirmer) {
    await client.query("rollback");
    console.log("Simulation : rien n'a été effacé. Ajouter --confirmer pour effacer réellement.");
  } else if (simulation) {
    // Développement : comptes d'authentification simulés dans la même base (effacement en cascade).
    await client.query("delete from auth.users where id = any($1::uuid[])", [comptes]);
    await client.query("commit");
    console.log(`Effacé : ${comptes.length} compte(s).`);
  } else {
    await client.query("commit"); // échanges expirés effacés
    const admin = createClient(
      process.env.URL_SUPABASE ?? "",
      process.env.CLE_SERVICE_SUPABASE ?? "",
      {
        auth: { persistSession: false, autoRefreshToken: false },
      },
    );
    let echecs = 0;
    for (const compte of comptes) {
      const { error } = await admin.auth.admin.deleteUser(compte);
      if (error) echecs += 1;
    }
    console.log(
      `Effacé : ${comptes.length - echecs} compte(s) ; échecs : ${echecs} (relancer plus tard).`,
    );
    if (echecs > 0) process.exitCode = 1;
  }
} catch (erreur) {
  await client.query("rollback").catch(() => undefined);
  console.error(`Purge interrompue : ${(erreur as Error).message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
