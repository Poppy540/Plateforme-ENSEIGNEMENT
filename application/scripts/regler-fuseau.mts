// Fuseau de la base = fuseau du pays du déploiement (Jalon 22, étape 4 ; ADR 0114) : la journée des quotas, des
// limites et des chiffres du pilote change à minuit, heure du pays. À lancer après l'import du pack.
//   pnpm base:fuseau             règle le fuseau de la base (connexion d'administration)
//   pnpm base:fuseau --simuler   dit ce qui serait fait, sans rien changer
// Variable : URL_BASE_DONNEES_ADMIN (jamais affichée).
import pg from "pg";
import { fuseauDuDeploiement, type PaysEnBase } from "../src/lib/production/pays-de-la-base.ts";

const simuler = process.argv.includes("--simuler");
const url = process.env.URL_BASE_DONNEES_ADMIN;
if (!url) {
  console.error("URL_BASE_DONNEES_ADMIN manquante.");
  process.exit(2);
}
const client = new pg.Client({ connectionString: url });
await client.connect();
let code = 0;
try {
  const pays = (
    await client.query(
      "select code, nom, fuseau_horaire as fuseau, statut_pack as statut from pays order by code",
    )
  ).rows as PaysEnBase[];
  const choix = fuseauDuDeploiement(pays);
  if ("erreur" in choix) {
    console.error(`Refusé : ${choix.erreur}.`);
    code = 1;
  } else if (
    (await client.query("select 1 from pg_timezone_names where name = $1", [choix.fuseau]))
      .rowCount === 0
  ) {
    console.error(`Refusé : fuseau « ${choix.fuseau} » inconnu de Postgres (pays.yaml du pack).`);
    code = 1;
  } else {
    const actuel = (
      await client.query(
        `select coalesce((select split_part(c, '=', 2) from pg_db_role_setting s, unnest(s.setconfig) c
                          where s.setdatabase = (select oid from pg_database where datname = current_database())
                            and s.setrole = 0 and c like 'TimeZone=%'), '(par défaut du serveur)') as f`,
      )
    ).rows[0].f as string;
    if (actuel === choix.fuseau)
      console.log(`Fuseau de la base déjà réglé : ${choix.fuseau} (${choix.pays.nom}).`);
    else if (simuler)
      console.log(
        `Simulation : le fuseau de la base passerait de ${actuel} à ${choix.fuseau} (${choix.pays.nom}).`,
      );
    else {
      const { rows } = await client.query(
        "select format('alter database %I set timezone to %L', current_database(), $1::text) as sql",
        [choix.fuseau],
      );
      await client.query(rows[0].sql);
      console.log(
        `Fuseau de la base réglé : ${choix.fuseau} (${choix.pays.nom}), au lieu de ${actuel}. ` +
          "Redémarrer l'application pour que ses connexions le prennent.",
      );
    }
  }
} finally {
  await client.end();
}
process.exit(code);
