// Vérifie la configuration de production avant une mise en service (ADR 0045). À lancer par le propriétaire
// sur le serveur, avec ses variables d'environnement : `pnpm verifier:production`. N'affiche jamais une valeur.
// La base est lue avec la connexion de l'application, au nom d'un visiteur : pays importés et fuseau (ADR 0114).
import pg from "pg";
import { verifierPaysDeLaBase, type PaysEnBase } from "../src/lib/production/pays-de-la-base.ts";
import {
  verifierApiDeDonnees,
  verifierConfiguration,
  type Constat,
} from "../src/lib/production/verification.ts";

async function verifierBase(): Promise<Constat[]> {
  const point = "Pays de la base";
  if (!process.env.URL_BASE_DONNEES)
    return [{ ok: false, point, message: "non vérifiée (URL_BASE_DONNEES absente)" }];
  const client = new pg.Client({
    connectionString: process.env.URL_BASE_DONNEES,
    connectionTimeoutMillis: 10_000,
  });
  try {
    await client.connect();
    await client.query("begin read only");
    await client.query("set local role anon");
    const pays = (
      await client.query(
        "select code, nom, fuseau_horaire as fuseau, statut_pack as statut from pays order by code",
      )
    ).rows as PaysEnBase[];
    const fuseau = (await client.query("select current_setting('TimeZone') as f")).rows[0].f;
    await client.query("rollback");
    return verifierPaysDeLaBase(pays, fuseau);
  } catch {
    return [{ ok: false, point, message: "non vérifiée (base injoignable)" }];
  } finally {
    await client.end().catch(() => {});
  }
}

const constats = [
  ...verifierConfiguration(process.env),
  await verifierApiDeDonnees(process.env),
  ...(await verifierBase()),
];
for (const c of constats)
  console.log(`${c.ok ? "OK      " : "À FAIRE "} ${c.point}${c.ok ? "" : ` : ${c.message}`}`);
const manques = constats.filter((c) => !c.ok).length;
console.log(
  manques === 0
    ? "Configuration complète."
    : `${manques} point(s) à régler avant la mise en service.`,
);
process.exit(manques === 0 ? 0 : 1);
