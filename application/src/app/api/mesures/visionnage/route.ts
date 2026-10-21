import { EVENEMENTS, type EvenementVisionnage } from "@/lib/exploitation/mesures";
import { noterVisionnage } from "@/lib/serveur/mesures";
import { utilisateurConnecte } from "@/lib/serveur/session";

// Compteur de visionnage agrégé (ADR 0052) : un événement de lecture (vidéo démarrée ou terminée, leçon ouverte)
// ajouté au total du chapitre et du jour ; rien n'est gardé sur l'élève. Quota par élève et par jour en base.
export async function POST(requete: Request): Promise<Response> {
  const origine = requete.headers.get("origin");
  if (origine && origine !== new URL(requete.url).origin)
    return Response.json({ erreur: "Origine refusée." }, { status: 403 });
  const utilisateur = await utilisateurConnecte();
  if (!utilisateur) return Response.json({ erreur: "Connexion requise." }, { status: 401 });
  const corps = (await requete.json().catch(() => null)) as {
    chapitre?: unknown;
    evenement?: unknown;
  } | null;
  const chapitre = typeof corps?.chapitre === "string" ? corps.chapitre : "";
  const evenement = corps?.evenement as EvenementVisionnage;
  if (!/^[0-9a-f-]{36}$/.test(chapitre) || !EVENEMENTS.includes(evenement))
    return Response.json({ erreur: "Événement invalide." }, { status: 400 });
  try {
    await noterVisionnage(utilisateur, chapitre, evenement);
  } catch {
    return Response.json({ erreur: "Non compté." }, { status: 403 });
  }
  return new Response(null, { status: 204 });
}
