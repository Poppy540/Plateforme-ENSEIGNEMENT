import { timingSafeEqual } from "node:crypto";
import { jetonExecuteur } from "@/lib/serveur/configuration";
import { executerFile } from "@/lib/serveur/orchestrateur";
import { detecterDecrochages } from "@/lib/serveur/tuteur";

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
  const traitees = await executerFile(5);
  const decrochages = await detecterDecrochages();
  return Response.json(
    { traitees: traitees.length, decrochages },
    { headers: { "cache-control": "no-store" } },
  );
}
