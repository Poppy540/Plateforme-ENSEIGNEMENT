import type { Instrumentation } from "next";

// Instrumentation du serveur (ADR 0056) : la console est nettoyée de toute donnée personnelle dès le démarrage, et
// chaque erreur de requête est journalisée sans adresse complète, sans en-tête ni corps (seulement le chemin sans
// paramètres, la route, le type d'erreur et son empreinte).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { installerNettoyageConsole } = await import("./lib/journal");
    installerNettoyageConsole();
  }
}

export const onRequestError: Instrumentation.onRequestError = async (erreur, requete, contexte) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { journaliser } = await import("./lib/journal");
  const e = erreur instanceof Error ? erreur : null;
  // Le navigateur a quitté la page avant la fin de l'envoi (réseau coupé, navigation) : rien à corriger.
  const interrompue = e?.message === "The destination stream closed early.";
  await journaliser(
    interrompue ? "avertissement" : "erreur",
    interrompue ? "requete_interrompue" : "erreur_requete",
    {
      methode: requete.method,
      chemin: requete.path.split("?")[0],
      route: contexte.routePath,
      type: contexte.routeType,
      erreur: e?.name ?? typeof erreur,
      message: e?.message,
      empreinte:
        typeof erreur === "object" && erreur !== null && "digest" in erreur
          ? String((erreur as { digest: unknown }).digest)
          : undefined,
    },
  );
};
