import { rapportMarkdown } from "@/lib/pilote/semaine";
import { roleCompte } from "@/lib/serveur/referent";
import { finDeSemaine, semaineDuPilote, versionDemandee } from "@/lib/serveur/semaine-pilote";
import { utilisateurConnecte } from "@/lib/serveur/session";

// Rapport de la semaine du pilote en texte (Markdown), pour le point hebdomadaire ou l'établissement (ADR 0082) :
// chiffres agrégés, petits effectifs masqués, aucune donnée individuelle. Administration seulement.
export async function GET(requete: Request): Promise<Response> {
  const utilisateur = await utilisateurConnecte();
  if (!utilisateur || (await roleCompte(utilisateur)) !== "administrateur")
    return Response.json({ erreur: "Administration requise." }, { status: 403 });
  const parametres = new URL(requete.url).searchParams;
  const fin = finDeSemaine(parametres.get("fin"));
  const version = versionDemandee(parametres.get("version"));
  const texte = rapportMarkdown(await semaineDuPilote(utilisateur, fin, version));
  return new Response(texte, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="semaine-pilote-${fin}-${version}.md"`,
      "cache-control": "no-store",
    },
  });
}
