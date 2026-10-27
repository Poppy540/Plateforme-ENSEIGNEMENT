// Migrations suivies (ADR 0075) : applique, dans l'ordre et chacune dans sa transaction, les migrations qui manquent,
// et note en base celles déjà passées (nom, empreinte). À lancer avec la connexion d'administration.
//   pnpm base:migrer                          applique ce qui manque
//   pnpm base:migrer --simuler                montre ce qui serait appliqué, sans rien changer
//   pnpm base:migrer --marquer-jusqu-a <nom>  base déjà migrée à la main (avant cet outil) : note comme appliquées
//                                             les migrations jusqu'à <nom> inclus, sans les rejouer
// Variable : URL_BASE_DONNEES_ADMIN (jamais affichée).
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import pg from "pg";
import { empreinteMigration, planifier } from "../src/lib/exploitation/migrations.ts";

const args = process.argv.slice(2);
const simuler = args.includes("--simuler");
const iMarquer = args.indexOf("--marquer-jusqu-a");
const marquerJusqua = iMarquer >= 0 ? args[iMarquer + 1] : null;
const url = process.env.URL_BASE_DONNEES_ADMIN;
if (!url) {
  console.error("URL_BASE_DONNEES_ADMIN manquante.");
  process.exit(2);
}
const dossier = resolve(process.env.DOSSIER_MIGRATIONS ?? "supabase/migrations");
const fichiers = readdirSync(dossier)
  .filter((n) => n.endsWith(".sql"))
  .map((nom) => ({ nom, contenu: readFileSync(join(dossier, nom), "utf8") }));

const client = new pg.Client({ connectionString: url });
await client.connect();
let code = 0;
try {
  // Un seul passage à la fois (verrou consultatif, levé à la fin de la session).
  await client.query("select pg_advisory_lock(hashtext('base:migrer'))");
  const suivi = (
    await client.query("select to_regclass('public.migrations_appliquees') is not null as existe")
  ).rows[0].existe as boolean;
  const dejaMigree = (
    await client.query("select to_regclass('public.referentiels') is not null as existe")
  ).rows[0].existe as boolean;

  if (!suivi && dejaMigree && !marquerJusqua) {
    console.error(
      "Cette base a déjà des tables mais aucun suivi des migrations : elle a été migrée à la main.\n" +
        "Vérifiez la dernière migration appliquée, puis relancez avec --marquer-jusqu-a <nom du fichier>.",
    );
    code = 2;
  } else {
    if (!simuler) {
      await client.query(`
        create table if not exists public.migrations_appliquees (
          nom text primary key,
          empreinte text not null,
          appliquee_le timestamptz not null default now()
        );
        alter table public.migrations_appliquees enable row level security;
        revoke all on public.migrations_appliquees from public;
        do $$ declare r text; begin
          foreach r in array array['anon', 'authenticated', 'service_role'] loop
            if exists (select 1 from pg_roles where rolname = r) then
              execute format('revoke all on public.migrations_appliquees from %I', r);
            end if;
          end loop;
        end $$;`);
    }
    if (marquerJusqua && !suivi) {
      const marquees = fichiers
        .filter((f) => f.nom <= marquerJusqua)
        .sort((a, b) => a.nom.localeCompare(b.nom));
      if (!fichiers.some((f) => f.nom === marquerJusqua))
        throw new Error(`Migration inconnue : ${marquerJusqua}`);
      if (!simuler)
        for (const f of marquees)
          await client.query(
            "insert into public.migrations_appliquees (nom, empreinte) values ($1, $2) on conflict do nothing",
            [f.nom, empreinteMigration(f.contenu)],
          );
      console.log(
        `${marquees.length} migration(s) notée(s) comme déjà appliquée(s), jusqu'à ${marquerJusqua}.`,
      );
    }
    const enregistrees =
      suivi || (marquerJusqua && !simuler)
        ? (
            await client.query(
              "select nom, empreinte from public.migrations_appliquees order by nom",
            )
          ).rows
        : marquerJusqua
          ? fichiers
              .filter((f) => f.nom <= marquerJusqua)
              .map((f) => ({ nom: f.nom, empreinte: empreinteMigration(f.contenu) }))
          : [];
    const plan = planifier(fichiers, enregistrees);
    if (!plan.ok) {
      console.error(`Migrations refusées :\n- ${plan.erreurs.join("\n- ")}`);
      code = 1;
    } else if (plan.aAppliquer.length === 0) {
      console.log(`Base à jour (${plan.dejaAppliquees} migration(s) appliquée(s)).`);
    } else if (simuler) {
      console.log(
        `À appliquer (${plan.aAppliquer.length}) :\n- ${plan.aAppliquer.map((m) => m.nom).join("\n- ")}`,
      );
    } else {
      for (const m of plan.aAppliquer) {
        try {
          await client.query("begin");
          await client.query(m.contenu);
          await client.query(
            "insert into public.migrations_appliquees (nom, empreinte) values ($1, $2)",
            [m.nom, m.empreinte],
          );
          await client.query("commit");
          console.log(`Appliquée : ${m.nom}`);
        } catch (erreur) {
          await client.query("rollback").catch(() => undefined);
          console.error(
            `Échec de ${m.nom} (annulée, rien n'en reste) : ${(erreur as Error).message}`,
          );
          code = 1;
          break;
        }
      }
      if (code === 0)
        console.log(`Base à jour : ${plan.aAppliquer.length} migration(s) appliquée(s).`);
    }
  }
} finally {
  await client.end();
}
process.exit(code);
