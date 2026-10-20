import { exportCsv } from "@/lib/exploitation/indicateurs";
import { roleCompte } from "@/lib/serveur/referent";
import { indicateursQuotidiens } from "@/lib/serveur/exploitation";
import { utilisateurConnecte } from "@/lib/serveur/session";

// Export des indicateurs quotidiens AGRÉGÉS pour le retour d'expérience (ADR 0046) : petits effectifs masqués,
// aucune donnée individuelle. Administration seulement.
export async function GET(requete: Request): Promise<Response> {
  const utilisateur = await utilisateurConnecte();
  if (!utilisateur || (await roleCompte(utilisateur)) !== "administrateur")
    return Response.json({ erreur: "Administration requise." }, { status: 403 });
  const demande = Number(new URL(requete.url).searchParams.get("jours"));
  const jours = Number.isInteger(demande) && demande >= 1 && demande <= 366 ? demande : 30;
  const csv = exportCsv(await indicateursQuotidiens(utilisateur, jours));
  return new Response(`﻿${csv}\n`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="indicateurs-${jours}-jours.csv"`,
      "cache-control": "no-store",
    },
  });
}
