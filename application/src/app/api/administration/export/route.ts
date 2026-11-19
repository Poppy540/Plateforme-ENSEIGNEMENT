import { exportCsv } from "@/lib/exploitation/indicateurs";
import { csvQuestionnaire, csvVisionnages } from "@/lib/exploitation/mesures";
import { resultatsQuestionnaires, visionnagesParChapitre } from "@/lib/serveur/mesures";
import { roleCompte } from "@/lib/serveur/referent";
import { indicateursQuotidiens } from "@/lib/serveur/exploitation";
import { utilisateurConnecte } from "@/lib/serveur/session";

// Export des indicateurs quotidiens AGRÉGÉS pour le retour d'expérience (ADR 0046) : petits effectifs masqués,
// aucune donnée individuelle. Administration seulement.
export async function GET(requete: Request): Promise<Response> {
  const utilisateur = await utilisateurConnecte();
  if (!utilisateur || (await roleCompte(utilisateur)) !== "administrateur")
    return Response.json({ erreur: "Administration requise." }, { status: 403 });
  const parametres = new URL(requete.url).searchParams;
  const demande = Number(parametres.get("jours"));
  const jours = Number.isInteger(demande) && demande >= 1 && demande <= 366 ? demande : 30;
  // Mesures du pilote (ADR 0052) : visionnage par chapitre, résultats du questionnaire anonyme.
  const type = parametres.get("type");
  const [csv, nom] =
    type === "visionnages"
      ? [
          csvVisionnages(await visionnagesParChapitre(utilisateur, jours)),
          `visionnages-${jours}-jours`,
        ]
      : type === "questionnaire"
        ? [csvQuestionnaire(await resultatsQuestionnaires(utilisateur)), "questionnaire"]
        : [
            exportCsv(await indicateursQuotidiens(utilisateur, jours)),
            `indicateurs-${jours}-jours`,
          ];
  return new Response(`﻿${csv}\n`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${nom}.csv"`,
      "cache-control": "no-store",
    },
  });
}
