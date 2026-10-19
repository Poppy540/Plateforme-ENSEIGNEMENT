// Service worker de la plateforme (Jalon 5, étape 1 ; ADR 0044) : connexions lentes et coupures.
// - Fichiers statiques de Next.js (noms à empreinte, immuables) : servis depuis le cache.
// - Pages de chapitre déjà ouvertes : réseau d'abord, copie gardée pour la lecture hors ligne.
// - Copies propres à la session : elles portent la clé de session (pseudonyme calculé par le serveur) ; une
//   autre clé, ou la déconnexion, efface tout. Aucune page d'un autre élève n'est jamais servie.
// - Rien d'autre n'est gardé : ni vidéos, ni quiz, ni réponses du professeur à venir, ni données d'API.
const VERSION = "v1";
const STATIQUE = `statique-${VERSION}`;
const META = `meta-${VERSION}`;
const PREFIXE_CHAPITRES = "chapitres-";
const PAGE_HORS_LIGNE = "/hors-ligne";
// /catalogue/<unité>/<chapitre> (pas le quiz) : seules pages lisibles hors ligne.
const CHAPITRE = /^\/catalogue\/[a-z0-9-]+\/[a-z0-9-]+\/?$/;

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

async function chapitresGardes() {
  const cle = await cleCourante();
  if (!cle) return [];
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

/** Copie d'une page de chapitre, avec son titre et sa date (lus dans la page, rien d'autre). */
async function garderChapitre(requete, reponse) {
  const cle = await cleCourante();
  if (!cle) return;
  const texte = await reponse.text();
  const titre = (texte.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "")
    .replace(/<[^>]+>/g, "")
    .trim();
  const entetes = new Headers({ "content-type": "text/html; charset=utf-8" });
  entetes.set("x-titre-chapitre", encodeURIComponent(titre).slice(0, 300));
  entetes.set("x-garde-le", new Date().toISOString());
  const cache = await caches.open(PREFIXE_CHAPITRES + cle);
  await cache.put(new URL(requete.url).pathname, new Response(texte, { headers: entetes }));
}

async function pageDeChapitre(evenement) {
  try {
    const reponse = await fetch(evenement.request);
    if (
      reponse.ok &&
      !reponse.redirected &&
      reponse.headers.get("content-type")?.includes("text/html")
    ) {
      evenement.waitUntil(garderChapitre(evenement.request, reponse.clone()));
    }
    return reponse;
  } catch {
    const cle = await cleCourante();
    const copie = cle
      ? await (
          await caches.open(PREFIXE_CHAPITRES + cle)
        ).match(new URL(evenement.request.url).pathname)
      : undefined;
    return copie || (await caches.match(PAGE_HORS_LIGNE)) || Response.error();
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
  } else if (requete.mode === "navigate" && CHAPITRE.test(url.pathname)) {
    evenement.respondWith(pageDeChapitre(evenement));
  } else if (requete.mode === "navigate") {
    evenement.respondWith(autrePage(requete));
  }
});
