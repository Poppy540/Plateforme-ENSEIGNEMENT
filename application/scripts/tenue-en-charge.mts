// Tenue en charge (Jalon 8, étape 3 ; ADR 0059) : N élèves FICTIFS connectés en même temps parcourent la plateforme
// (espace, catalogue, unité, chapitre, question au Professeur simulé, compteur de lecture, quiz). Mesure les temps de
// réponse (médiane, 95e centile, maximum) et les erreurs par page, puis les compare aux seuils.
//
//   pnpm charge                          200 élèves, 3 parcours chacun, sur http://localhost:3100
//   pnpm charge --eleves 50 --parcours 1 --pause 0
//
// Base LOCALE jetable seulement (données fictives) : le script refuse toute adresse de base qui n'est pas locale.
// Le serveur doit tourner en simulation (MODE_AUTH, MODE_MODELE) avec le secret de développement : les sessions des
// élèves fictifs sont ouvertes directement en base et leurs cookies signés comme le ferait le serveur.
// Variables : URL_CHARGE (adresse du site), URL_BASE_DONNEES_ADMIN (défaut : base locale), SECRET_SESSION (facultatif).
import { createHash } from "node:crypto";
import pg from "pg";
import { signerSession } from "../src/lib/session-signee.ts";

function option(nom: string, defaut: number): number {
  const i = process.argv.indexOf(`--${nom}`);
  const valeur = i >= 0 ? Number(process.argv[i + 1]) : defaut;
  if (!Number.isFinite(valeur) || valeur < 0) throw new Error(`--${nom} invalide.`);
  return valeur;
}

const ELEVES = option("eleves", 200);
const PARCOURS = option("parcours", 3);
const PAUSE_MS = option("pause", 1000); // temps de lecture moyen entre deux pages (aléatoire autour de cette valeur)
const SEUIL_P95_MS = option("seuil-p95", 2000);
const SEUIL_ERREURS = option("seuil-erreurs", 0.01);
const UNITE = process.env.UNITE_CHARGE ?? "ga-3e-mathematiques";
// Plusieurs adresses séparées par des virgules : un processus du serveur par adresse ; chaque élève reste sur la
// même (comme derrière un répartiteur de charge).
const SITES = (process.env.URL_CHARGE ?? "http://localhost:3100").split(",").map((s) => s.trim());
const siteDe = new Map<string, string>();
const BASE = process.env.URL_BASE_DONNEES_ADMIN ?? "postgresql://postgres@127.0.0.1:54330/postgres";
const SECRET =
  process.env.SECRET_SESSION ?? "secret-de-developpement-uniquement-jamais-en-production";
const REFERENT_FICTIF = "99999999-9999-4999-8999-999999999999";

if (!/@(127\.0\.0\.1|localhost)(:\d+)?\//.test(BASE)) {
  console.error(
    "Refusé : la tenue en charge ne s'exécute que sur une base locale de données fictives.",
  );
  process.exit(2);
}

/** Identifiant stable d'un élève fictif de charge (même forme qu'un UUID v4). */
function identifiant(i: number): string {
  const h = createHash("sha256").update(`charge:eleve:${i}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

// 1. Préparation en base : chapitres validés, élèves fictifs actifs, une session ouverte chacun.
const base = new pg.Client({ connectionString: BASE });
await base.connect();
let chapitres: string[];
const cookies: string[] = [];
try {
  await base.query("insert into auth.users (id) values ($1) on conflict do nothing", [
    REFERENT_FICTIF,
  ]);
  await base.query(
    `insert into profils (id, role, prenom_ou_pseudo) values ($1, 'referent', 'Référent fictif') on conflict do nothing`,
    [REFERENT_FICTIF],
  );
  await base.query(
    `with choisis as (
       select c.id, c.version, c.empreinte from chapitres c join unites u on u.id = c.unite_id
       where u.code = $1 and c.statut <> 'valide' order by c.ordre limit 3
     ), traces as (
       insert into approbations (objet_type, objet_id, version, empreinte, decision, commentaire, valideur_id)
       select 'chapitre', id, version, empreinte, 'valide', 'Tenue en charge (fictif)', $2 from choisis
     )
     update chapitres set statut = 'valide' where id in (select id from choisis)`,
    [UNITE, REFERENT_FICTIF],
  );
  chapitres = (
    await base.query(
      `select c.code from chapitres c join unites u on u.id = c.unite_id
       where u.code = $1 and c.statut = 'valide' order by c.ordre limit 3`,
      [UNITE],
    )
  ).rows.map((r) => r.code as string);
  if (chapitres.length === 0) throw new Error(`Aucun chapitre validé dans ${UNITE}.`);
  // Un quiz fictif validé par chapitre qui n'en a pas (comme après la relecture du référent).
  const question = {
    type: "qcm",
    enonce: "Question fictive de tenue en charge",
    options: ["A", "B", "C"],
    bonne_reponse: 0,
    reponse_attendue: "A",
    explication: "Explication fictive.",
    notion: "fictive",
    chapitre: "fictif",
    difficulte: "facile",
    guide_reponses: [],
    erreurs_deduites: [],
    verification: "fictive",
  };
  await base
    .query(
      `with nouveaux as (
       insert into quiz (chapitre_id, questions, cree_par)
       select c.id, $3::jsonb, 'agent_evaluateur' from chapitres c join unites u on u.id = c.unite_id
       where u.code = $1 and c.code = any($2)
         and not exists (select 1 from quiz q where q.chapitre_id = c.id and q.statut = 'valide')
       returning id, version, empreinte
     ), traces as (
       insert into approbations (objet_type, objet_id, version, empreinte, decision, commentaire, valideur_id)
       select 'quiz', id, version, empreinte, 'valide', 'Tenue en charge (fictif)', $4 from nouveaux
     )
     select id from nouveaux`,
      [UNITE, chapitres, JSON.stringify([question]), REFERENT_FICTIF],
    )
    .then((r) =>
      r.rows.length
        ? base.query("update quiz set statut = 'valide' where id = any($1)", [
            r.rows.map((x) => x.id),
          ])
        : null,
    );

  const ids = Array.from({ length: ELEVES }, (_, i) => identifiant(i));
  await base.query("insert into auth.users (id) select unnest($1::uuid[]) on conflict do nothing", [
    ids,
  ]);
  await base.query(
    `insert into profils (id, role, prenom_ou_pseudo)
     select unnest($1::uuid[]), 'eleve', 'Élève fictif de charge' on conflict do nothing`,
    [ids],
  );
  await base.query(
    `insert into eleves (id, referentiel_id, niveau_id, est_mineur, statut)
     select e, u.referentiel_id, u.niveau_id, true, 'actif' from unnest($1::uuid[]) e, unites u
     where u.code = $2 on conflict do nothing`,
    [ids, UNITE],
  );
  // Élèves de charge réutilisés d'un passage à l'autre : leurs quotas du jour repartent de zéro (sinon la limite de
  // questions au Professeur, voulue, compterait comme une erreur). Seulement ces comptes fictifs, en base locale.
  await base.query("delete from echanges_professeur where eleve_id = any($1)", [ids]);
  await base.query("delete from quotas_eleves where eleve_id = any($1)", [ids]);
  const expire = Date.now() + 24 * 3600 * 1000;
  const sessions = await base.query(
    `insert into sessions_ouvertes (utilisateur, expire_le)
     select unnest($1::uuid[]), now() + interval '1 day' returning id, utilisateur`,
    [ids],
  );
  for (const s of sessions.rows) {
    const cookie = `session=${signerSession({ utilisateur: s.utilisateur, session: s.id, expire }, SECRET)}`;
    siteDe.set(cookie, SITES[cookies.length % SITES.length]);
    cookies.push(cookie);
  }
} finally {
  await base.end();
}

// 2. Parcours simultanés.
type Mesure = { page: string; ms: number; ok: boolean; statut: number };
const mesures: Mesure[] = [];
const pause = () =>
  new Promise((r) => setTimeout(r, PAUSE_MS === 0 ? 0 : PAUSE_MS * (0.5 + Math.random())));

async function appel(page: string, cookie: string, chemin: string, corps?: unknown) {
  const debut = performance.now();
  let statut = 0;
  try {
    const reponse = await fetch(`${siteDe.get(cookie)}${chemin}`, {
      method: corps ? "POST" : "GET",
      headers: { cookie, ...(corps ? { "content-type": "application/json" } : {}) },
      body: corps ? JSON.stringify(corps) : undefined,
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
    });
    statut = reponse.status;
    await reponse.arrayBuffer(); // réponse lue en entier (la réponse du Professeur arrive au fil de l'eau)
  } catch {
    statut = 0;
  }
  mesures.push({ page, ms: performance.now() - debut, ok: statut >= 200 && statut < 300, statut });
}

async function eleve(i: number) {
  const cookie = cookies[i];
  await new Promise((r) => setTimeout(r, Math.random() * PAUSE_MS)); // arrivées étalées sur une pause
  for (let p = 0; p < PARCOURS; p++) {
    const chapitre = chapitres[(i + p) % chapitres.length];
    await appel("espace", cookie, "/espace");
    await pause();
    await appel("catalogue", cookie, "/catalogue");
    await pause();
    await appel("unite", cookie, `/catalogue/${UNITE}`);
    await pause();
    await appel("chapitre", cookie, `/catalogue/${UNITE}/${chapitre}`);
    await appel("compteur", cookie, "/api/mesures/visionnage", {
      chapitre: await idChapitre(chapitre),
      evenement: "lecon_ouverte",
    });
    await pause();
    await appel("professeur", cookie, "/api/professeur", {
      unite: UNITE,
      chapitre,
      question: "Peux-tu m'expliquer la méthode avec un exemple ?",
    });
    await pause();
    await appel("quiz", cookie, `/catalogue/${UNITE}/${chapitre}/quiz`);
    await pause();
  }
}

const idsChapitres = new Map<string, string>();
async function idChapitre(code: string): Promise<string> {
  if (!idsChapitres.has(code)) {
    const c = new pg.Client({ connectionString: BASE });
    await c.connect();
    const { rows } = await c.query(
      `select c.id from chapitres c join unites u on u.id = c.unite_id where u.code = $1 and c.code = $2`,
      [UNITE, code],
    );
    await c.end();
    idsChapitres.set(code, rows[0].id);
  }
  return idsChapitres.get(code)!;
}
for (const c of chapitres) await idChapitre(c);

console.log(
  `Tenue en charge : ${ELEVES} élèves fictifs simultanés, ${PARCOURS} parcours chacun, pause ~${PAUSE_MS} ms, ${SITES.join(" + ")}`,
);
const debut = performance.now();
await Promise.all(Array.from({ length: ELEVES }, (_, i) => eleve(i)));
const duree = (performance.now() - debut) / 1000;

// 3. Rapport.
function centile(valeurs: number[], q: number): number {
  const tri = [...valeurs].sort((a, b) => a - b);
  return tri[Math.min(tri.length - 1, Math.ceil(q * tri.length) - 1)] ?? 0;
}
const lignes = [...new Set(mesures.map((m) => m.page))].map((page) => {
  const m = mesures.filter((x) => x.page === page);
  const ms = m.map((x) => x.ms);
  const erreurs = m.filter((x) => !x.ok);
  return {
    page,
    requetes: m.length,
    erreurs: erreurs.length,
    statuts: [...new Set(erreurs.map((x) => x.statut))].join(",") || "-",
    p50: Math.round(centile(ms, 0.5)),
    p95: Math.round(centile(ms, 0.95)),
    max: Math.round(Math.max(...ms)),
  };
});
console.table(lignes);
const tous = mesures.map((m) => m.ms);
const tauxErreurs = mesures.filter((m) => !m.ok).length / mesures.length;
const p95 = centile(tous, 0.95);
console.log(
  `${mesures.length} requêtes en ${duree.toFixed(1)} s (${(mesures.length / duree).toFixed(1)} par seconde) ; ` +
    `médiane ${Math.round(centile(tous, 0.5))} ms, 95e centile ${Math.round(p95)} ms, ` +
    `erreurs ${(tauxErreurs * 100).toFixed(2)} %`,
);
const reussi = p95 <= SEUIL_P95_MS && tauxErreurs <= SEUIL_ERREURS;
console.log(
  reussi
    ? `Seuils tenus (95e centile ≤ ${SEUIL_P95_MS} ms, erreurs ≤ ${SEUIL_ERREURS * 100} %).`
    : `Seuils NON tenus (95e centile ≤ ${SEUIL_P95_MS} ms, erreurs ≤ ${SEUIL_ERREURS * 100} %).`,
);
process.exit(reussi ? 0 : 1);
