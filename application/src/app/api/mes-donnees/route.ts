import { exporterDonnees } from "@/lib/serveur/mes-donnees";
import { utilisateurConnecte } from "@/lib/serveur/session";

// Export de toutes les données du compte connecté (droit d'accès, prompt maître §6).
export async function GET(): Promise<Response> {
  const utilisateur = await utilisateurConnecte();
  if (!utilisateur) return Response.json({ erreur: "Connexion requise." }, { status: 401 });
  const donnees = await exporterDonnees(utilisateur);
  return new Response(JSON.stringify(donnees, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="mes-donnees.json"',
      "cache-control": "no-store",
    },
  });
}
