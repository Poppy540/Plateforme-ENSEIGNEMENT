import { utilisateurConnecte } from "@/lib/serveur/session";
import { sousTitres } from "@/lib/serveur/videos";

// Sous-titres d'une vidéo (piste WebVTT du lecteur) : seulement si l'utilisateur peut voir la vidéo.
export async function GET(
  _requete: Request,
  { params }: RouteContext<"/api/videos/[id]/sous-titres">,
): Promise<Response> {
  const utilisateur = await utilisateurConnecte();
  if (!utilisateur) return new Response("Connexion requise.", { status: 401 });
  const { id } = await params;
  const vtt = await sousTitres(utilisateur, id);
  if (!vtt) return new Response("Introuvable.", { status: 404 });
  return new Response(vtt, {
    headers: {
      "content-type": "text/vtt; charset=utf-8",
      "cache-control": "private, max-age=3600",
    },
  });
}
