import { avecVisiteur } from "@/lib/serveur/base";

// État de service pour la surveillance (ADR 0045) : l'application répond et la base est joignable. Aucune
// donnée, aucun détail d'erreur (seulement 200 ou 503).
export async function GET(): Promise<Response> {
  try {
    await avecVisiteur((client) => client.query("select 1"));
    return Response.json({ etat: "ok" }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json(
      { etat: "base injoignable" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
