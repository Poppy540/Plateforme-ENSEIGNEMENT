import { roleCompte } from "@/lib/serveur/referent";
import { deposerDocument, TAILLE_PDF_MAX } from "@/lib/serveur/conformite";
import { utilisateurConnecte } from "@/lib/serveur/session";

// Dépôt d'un document officiel (ADR 0039) : route dédiée, pour accepter un PDF de 10 Mo sans relever la limite
// de toutes les actions serveur. La taille annoncée est vérifiée avant de lire le corps.
export async function POST(requete: Request): Promise<Response> {
  const retour = (parametres: string) =>
    Response.redirect(new URL(`/referent/conformite?${parametres}`, requete.url), 303);
  // Défense en profondeur (le cookie de session est déjà SameSite=Lax) : même origine exigée.
  const origine = requete.headers.get("origin");
  if (origine && origine !== new URL(requete.url).origin)
    return Response.json({ erreur: "Origine refusée." }, { status: 403 });
  const utilisateur = await utilisateurConnecte();
  if (!utilisateur || (await roleCompte(utilisateur)) !== "referent")
    return Response.json({ erreur: "Référent requis." }, { status: 403 });
  if (Number(requete.headers.get("content-length") ?? 0) > TAILLE_PDF_MAX + 100_000)
    return retour(`erreur=${encodeURIComponent("Fichier trop lourd (10 Mo au plus).")}`);
  let donnees: FormData;
  try {
    donnees = await requete.formData();
  } catch {
    return retour(`erreur=${encodeURIComponent("Envoi illisible.")}`);
  }
  const fichier = donnees.get("pdf");
  const pdf =
    fichier instanceof File && fichier.size > 0 ? Buffer.from(await fichier.arrayBuffer()) : null;
  const erreur = await deposerDocument(utilisateur, {
    titre: String(donnees.get("titre") ?? ""),
    origine: String(donnees.get("origine") ?? ""),
    declareOfficiel: donnees.get("officiel") === "oui",
    texte: pdf ? null : String(donnees.get("texte") ?? "") || null,
    pdf,
  });
  return retour(erreur ? `erreur=${encodeURIComponent(erreur)}` : "depot=ok");
}
