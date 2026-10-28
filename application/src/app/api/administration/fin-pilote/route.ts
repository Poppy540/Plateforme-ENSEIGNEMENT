import { rapportFinMarkdown } from "@/lib/pilote/fin";
import { noterRapportTelecharge } from "@/lib/serveur/cloture-pilote";
import { periodeDuPilote, rapportDeFin } from "@/lib/serveur/fin-pilote";
import { roleCompte } from "@/lib/serveur/referent";
import { versionDemandee } from "@/lib/serveur/semaine-pilote";
import { utilisateurConnecte } from "@/lib/serveur/session";

// Rapport de fin de pilote en texte (Markdown), base du rapport de docs/bilans/ et de la réunion de bilan
// (ADR 0084) : chiffres agrégés, petits effectifs masqués, aucune donnée individuelle. Administration seulement.
export async function GET(requete: Request): Promise<Response> {
  const utilisateur = await utilisateurConnecte();
  if (!utilisateur || (await roleCompte(utilisateur)) !== "administrateur")
    return Response.json({ erreur: "Administration requise." }, { status: 403 });
  const periode = await periodeDuPilote(utilisateur);
  if (!periode) return Response.json({ erreur: "Période du pilote non saisie." }, { status: 404 });
  const version = versionDemandee(new URL(requete.url).searchParams.get("version"));
  const rapport = await rapportDeFin(utilisateur, periode, version);
  // Geste de clôture « rapport de fin téléchargé » (ADR 0085).
  await noterRapportTelecharge(utilisateur, version);
  return new Response(rapportFinMarkdown(rapport), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="rapport-fin-pilote-${rapport.debut}-${rapport.fin}-${version}.md"`,
      "cache-control": "no-store",
    },
  });
}
