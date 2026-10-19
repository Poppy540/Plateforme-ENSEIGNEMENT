"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

// Connexions lentes et coupures (Jalon 5, étape 1 ; ADR 0044) : enregistrement du service worker, clé de la
// session (les copies hors ligne d'une autre personne sont effacées), bandeau hors ligne, déconnexion qui
// efface tout ce qui est gardé sur l'appareil.

const PREFIXE_LOCAL = "plateforme:";

/** Efface les copies de pages et les questions en attente gardées sur l'appareil. */
export async function effacerDonneesLocales(): Promise<void> {
  try {
    for (const cle of Object.keys(localStorage))
      if (cle.startsWith(PREFIXE_LOCAL)) localStorage.removeItem(cle);
  } catch {
    // Stockage indisponible (navigation privée) : rien à effacer.
  }
  if ("caches" in window) {
    const noms = await caches.keys();
    await Promise.all(noms.filter((n) => n.startsWith("chapitres-")).map((n) => caches.delete(n)));
  }
  navigator.serviceWorker?.controller?.postMessage({ type: "session", cle: "" });
}

async function annoncerSession(cle: string): Promise<void> {
  // En développement, les fichiers n'ont pas d'empreinte : pas de service worker (code toujours à jour).
  if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") {
    if (!cle) await effacerDonneesLocales();
    return;
  }
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    const pret = await navigator.serviceWorker.ready;
    pret.active?.postMessage({ type: "session", cle });
  } catch {
    // Sans service worker, la plateforme marche, seulement sans lecture hors ligne.
  }
  if (!cle) await effacerDonneesLocales();
}

/** À placer sur les pages d'une personne connectée (clé) ou déconnectée (clé vide : tout est effacé). */
export function EnregistrementHorsLigne({ cle }: { cle: string }) {
  useEffect(() => {
    void annoncerSession(cle);
  }, [cle]);
  return null;
}

function abonner(rappel: () => void) {
  window.addEventListener("online", rappel);
  window.addEventListener("offline", rappel);
  return () => {
    window.removeEventListener("online", rappel);
    window.removeEventListener("offline", rappel);
  };
}

export function useEnLigne(): boolean {
  return useSyncExternalStore(
    abonner,
    () => navigator.onLine,
    () => true,
  );
}

const rien = () => () => {};

/** Vrai une fois la page interactive : avant, un envoi de formulaire rechargerait la page et perdrait la saisie. */
export function usePageInteractive(): boolean {
  return useSyncExternalStore(
    rien,
    () => true,
    () => false,
  );
}

export function BandeauHorsLigne() {
  const enLigne = useEnLigne();
  if (enLigne) return null;
  return (
    <p role="status" className="bandeau-hors-ligne">
      Tu es hors connexion : tu lis la dernière version enregistrée. Tes questions partiront au
      retour du réseau.
    </p>
  );
}

/** Bouton de déconnexion : efface d'abord ce qui est gardé sur l'appareil. */
export function FormulaireDeconnexion({ action }: { action: () => Promise<void> }) {
  return (
    <form
      action={async () => {
        await effacerDonneesLocales();
        await action();
      }}
    >
      <button type="submit" className="secondaire">
        Se déconnecter
      </button>
    </form>
  );
}

/** Liste des chapitres gardés sur l'appareil pour la session en cours (page hors ligne). */
export function ChapitresGardes() {
  const [liste, setListe] = useState<{ url: string; titre: string; gardeLe: string }[] | null>(
    null,
  );
  useEffect(() => {
    void (async () => {
      const controleur = navigator.serviceWorker
        ? (await navigator.serviceWorker.ready).active
        : null;
      if (!controleur) {
        setListe([]);
        return;
      }
      const canal = new MessageChannel();
      canal.port1.onmessage = (e) => setListe(e.data);
      controleur.postMessage({ type: "chapitres" }, [canal.port2]);
    })();
  }, []);
  if (liste === null) return <p>Recherche des chapitres enregistrés…</p>;
  if (liste.length === 0) return <p>Aucun chapitre enregistré sur cet appareil pour le moment.</p>;
  const format = new Intl.DateTimeFormat("fr", { dateStyle: "short", timeStyle: "short" });
  return (
    <ul className="chapitres-gardes">
      {liste.map((c) => (
        <li key={c.url}>
          <a href={c.url}>{decodeURIComponent(c.titre)}</a>
          {c.gardeLe && (
            <span className="note"> — enregistré le {format.format(new Date(c.gardeLe))}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

export const CLE_QUESTIONS = (session: string, unite: string, chapitre: string) =>
  `${PREFIXE_LOCAL}questions:${session}:${unite}:${chapitre}`;
