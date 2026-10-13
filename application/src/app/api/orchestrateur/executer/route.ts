import { timingSafeEqual } from "node:crypto";
import { executerFile } from "@/lib/serveur/orchestrateur";
import { jetonExecuteur, urlPublique } from "@/lib/serveur/configuration";
import { envoyerRapportsHebdomadaires } from "@/lib/serveur/rapports-parents";
import { detecterDecrochages } from "@/lib/serveur/tuteur";
import { alerterVeille } from "@/lib/serveur/veille";

// Exécuteur de la file de tâches, appelé régulièrement par un planificateur (ADR 0029).
// Authentification par jeton (en-tête Authorization: Bearer …) ; sans jeton configuré, l'exécuteur est désactivé.
export async function POST(requete: Request): Promise<Response> {
  const attendu = jetonExecuteur();
  if (!attendu) return Response.json({ erreur: "Exécuteur désactivé." }, { status: 503 });
  const recu = (requete.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  const a = Buffer.from(recu);
  const b = Buffer.from(attendu);
  if (a.length !== b.length || !timingSafeEqual(a, b))
    return Response.json({ erreur: "Non autorisé." }, { status: 401 });
  // L'alerte de veille passe en premier : rien ne doit la retarder (relances comprises).
  const alertes = await alerterVeille();
  const traitees = await executerFile(5);
  const decrochages = await detecterDecrochages();
  // Rapports hebdomadaires aux parents (adresse publique obligatoire pour les liens).
  const rapports = await envoyerRapportsHebdomadaires(urlPublique(null));
  return Response.json(
    { alertes, traitees: traitees.length, decrochages, rapports },
    { headers: { "cache-control": "no-store" } },
  );
}
