import { brouillonDeProgramme } from "@/lib/agents/conformite/programme";
import { rapportConformite } from "@/lib/serveur/conformite";
import { roleCompte } from "@/lib/serveur/referent";
import { utilisateurConnecte } from "@/lib/serveur/session";

// Brouillon de programme (YAML du pack) tiré de l'extraction d'un rapport ; rien n'est écrit (ADR 0039).
export async function GET(
  _requete: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const utilisateur = await utilisateurConnecte();
  if (!utilisateur || (await roleCompte(utilisateur)) !== "referent")
    return new Response("Référent requis.", { status: 403 });
  const { id } = await params;
  const r = await rapportConformite(utilisateur, id);
  if (!r) return new Response("Introuvable.", { status: 404 });
  const yaml = brouillonDeProgramme(r.contenu, {
    unite: r.unite,
    documentTitre: r.document.titre,
    empreinte: r.document.empreinte,
    rapportVersion: r.version,
    date: new Date(r.creeLe).toISOString().slice(0, 10),
  });
  return new Response(yaml, {
    headers: {
      "content-type": "text/yaml; charset=utf-8",
      "content-disposition": `attachment; filename="${r.unite}-brouillon-v${r.version}.yaml"`,
      "cache-control": "no-store",
    },
  });
}
