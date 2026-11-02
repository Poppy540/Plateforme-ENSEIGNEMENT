// Service worker de la plateforme (Jalon 5, étape 1 ; ADR 0044) : connexions lentes et coupures.
// - Fichiers statiques de Next.js (noms à empreinte, immuables) : servis depuis le cache.
// - Pages déjà ouvertes, réseau d'abord, copie gardée pour la lecture hors ligne (décision D14, ADR 0101) :
//   chapitres, « Mes cours », chapitres d'une matière, plan de révision, et correction d'un quiz déjà fait
//   (la page le signale par <meta name="garder-hors-ligne"> ; un quiz à faire n'est jamais gardé).
// - Toute copie de plus de 7 jours est effacée et n'est plus servie.
// - Copies propres à la session : elles portent la clé de session (pseudonyme calculé par le serveur) ; une
//   autre clé, ou la déconnexion, efface tout. Aucune page d'un autre élève n'est jamais servie.
// - Rien d'autre n'est gardé : ni vidéos, ni quiz à faire, ni réponses du professeur à venir, ni données d'API.
const VERSION = "v1";
const STATIQUE = `statique-${VERSION}`;
const META = `meta-${VERSION}`;
const PREFIXE_CHAPITRES = "chapitres-";
const PAGE_HORS_LIGNE = "/hors-ligne";
const CHAPITRE = /^\/catalogue\/[a-z0-9-]+\/[a-z0-9-]+\/?$/;
const QUIZ = /^\/catalogue\/[a-z0-9-]+\/[a-z0-9-]+\/quiz\/?$/;
// Pages lisibles hors ligne (D14). Le quiz seulement corrigé : marque posée par la page.
const PAGES_GARDEES = [
  CHAPITRE,
  /^\/catalogue\/?$/,
  /^\/catalogue\/[a-z0-9-]+\/?$/,
  /^\/espace\/plan\/?$/,
  QUIZ,
];
const MARQUE_GARDER = /<meta[^>]+name="garder-hors-ligne"/i;
const DUREE_COPIE_MS = 7 * 24 * 60 * 60 * 1000;
const aGarder = (chemin) => PAGES_GARDEES.some((r) => r.test(chemin));
const perimee = (reponse) =>
  Date.now() - Date.parse(reponse.headers.get("x-garde-le") || "") > DUREE_COPIE_MS ||
  !reponse.headers.get("x-garde-le");

self.addEventListener("install", (evenement) => {
  evenement.waitUntil(
    caches
      .open(STATIQUE)
      .then((cache) => cache.add(PAGE_HORS_LIGNE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (evenement) => {
  evenement.waitUntil(
    caches
      .keys()
      .then((noms) =>
        Promise.all(
          noms
            .filter((n) => !n.endsWith(`-${VERSION}`) && !n.startsWith(PREFIXE_CHAPITRES))
            .map((n) => caches.delete(n)),
        ),
      )
      .then(() => effacerPerimees())
      .then(() => self.clients.claim()),
  );
});

async function cleCourante() {
  const reponse = await (await caches.open(META)).match("/__session");
  return reponse ? reponse.text() : "";
}

async function changerSession(cle) {
  const meta = await caches.open(META);
  const ancienne = await cleCourante();
  if (ancienne === cle) return;
  // Nouvelle personne (ou déconnexion) : toutes les copies de pages sont effacées.
  const noms = await caches.keys();
  await Promise.all(
    noms.filter((n) => n.startsWith(PREFIXE_CHAPITRES)).map((n) => caches.delete(n)),
  );
  if (cle) await meta.put("/__session", new Response(cle));
  else await meta.delete("/__session");
}

/** Copies de plus de 7 jours effacées (D14), quelle que soit la personne. */
async function effacerPerimees() {
  const noms = (await caches.keys()).filter((n) => n.startsWith(PREFIXE_CHAPITRES));
  for (const nom of noms) {
    const cache = await caches.open(nom);
    for (const requete of await cache.keys()) {
      const reponse = await cache.match(requete);
      if (!reponse || perimee(reponse)) await cache.delete(requete);
    }
  }
}

async function chapitresGardes() {
  const cle = await cleCourante();
  if (!cle) return [];
  await effacerPerimees();
  const cache = await caches.open(PREFIXE_CHAPITRES + cle);
  const liste = [];
  for (const requete of await cache.keys()) {
    const reponse = await cache.match(requete);
    liste.push({
      url: new URL(requete.url).pathname,
      titre: reponse?.headers.get("x-titre-chapitre") || new URL(requete.url).pathname,
      gardeLe: reponse?.headers.get("x-garde-le") || "",
    });
  }
  return liste;
}

self.addEventListener("message", (evenement) => {
  const donnees = evenement.data || {};
  if (donnees.type === "session") {
    evenement.waitUntil(changerSession(typeof donnees.cle === "string" ? donnees.cle : ""));
  } else if (donnees.type === "chapitres" && evenement.ports[0]) {
    evenement.waitUntil(chapitresGardes().then((liste) => evenement.ports[0].postMessage(liste)));
  }
});

/** Copie d'une page gardée, avec son titre et sa date (lus dans la page, rien d'autre). */
async function garderChapitre(requete, reponse, demandeLe) {
  const cle = await cleCourante();
  if (!cle) return;
  const texte = await reponse.text();
  const chemin = new URL(requete.url).pathname;
  // Quiz : gardé seulement corrigé ; sinon, une ancienne copie corrigée ne doit pas rester.
  if (QUIZ.test(chemin) && !MARQUE_GARDER.test(texte)) {
    await (await caches.open(PREFIXE_CHAPITRES + cle)).delete(chemin);
    return;
  }
  const cache = await caches.open(PREFIXE_CHAPITRES + cle);
  // Deux chargements peuvent finir dans le désordre (réseau lent) : une copie plus ancienne ne remplace
  // jamais une copie plus récente.
  const existante = await cache.match(chemin);
  if (existante && Number(existante.headers.get("x-demande-le") || 0) > demandeLe) return;
  const titre = (texte.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "")
    .replace(/<[^>]+>/g, "")
    .trim();
  const entetes = new Headers({ "content-type": "text/html; charset=utf-8" });
  entetes.set("x-titre-chapitre", encodeURIComponent(titre).slice(0, 300));
  entetes.set("x-garde-le", new Date().toISOString());
  entetes.set("x-demande-le", String(demandeLe));
  await cache.put(chemin, new Response(texte, { headers: entetes }));
}

async function pageDeChapitre(evenement) {
  const demandeLe = Date.now();
  try {
    const reponse = await fetch(evenement.request);
    if (
      reponse.ok &&
      !reponse.redirected &&
      reponse.headers.get("content-type")?.includes("text/html")
    ) {
      evenement.waitUntil(garderChapitre(evenement.request, reponse.clone(), demandeLe));
    }
    return reponse;
  } catch {
    const cle = await cleCourante();
    const chemin = new URL(evenement.request.url).pathname;
    const cache = cle ? await caches.open(PREFIXE_CHAPITRES + cle) : null;
    const copie = cache ? await cache.match(chemin) : undefined;
    if (copie && !perimee(copie)) {
      // Date de la copie sur la page (attribut lu par le bandeau « hors ligne »), rien d'autre de modifié.
      const garde = copie.headers.get("x-garde-le");
      const texte = (await copie.text()).replace(/<html/i, `<html data-copie-du="${garde}"`);
      return new Response(texte, { headers: { "content-type": "text/html; charset=utf-8" } });
    }
    if (copie && cache) await cache.delete(chemin);
    return (await caches.match(PAGE_HORS_LIGNE)) || Response.error();
  }
}

async function autrePage(requete) {
  try {
    return await fetch(requete);
  } catch {
    return (await caches.match(PAGE_HORS_LIGNE)) || Response.error();
  }
}

async function fichierStatique(requete) {
  const cache = await caches.open(STATIQUE);
  const copie = await cache.match(requete);
  if (copie) return copie;
  const reponse = await fetch(requete);
  if (reponse.ok) await cache.put(requete, reponse.clone());
  return reponse;
}

self.addEventListener("fetch", (evenement) => {
  const requete = evenement.request;
  if (requete.method !== "GET") return;
  const url = new URL(requete.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/_next/static/")) {
    evenement.respondWith(fichierStatique(requete));
  } else if (requete.mode === "navigate" && aGarder(url.pathname)) {
    evenement.respondWith(pageDeChapitre(evenement));
  } else if (requete.mode === "navigate") {
    evenement.respondWith(autrePage(requete));
  }
});
