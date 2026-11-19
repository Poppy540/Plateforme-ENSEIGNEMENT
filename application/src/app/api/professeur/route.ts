import { contexteChapitre, LONGUEUR_QUESTION_MAX, poserQuestion } from "@/lib/serveur/professeur";
import { utilisateurConnecte } from "@/lib/serveur/session";

// Question à l'agent Professeur ; la réponse est envoyée en texte au fil de la génération.
export async function POST(requete: Request): Promise<Response> {
  const utilisateur = await utilisateurConnecte();
  if (!utilisateur) return Response.json({ erreur: "Connexion requise." }, { status: 401 });

  let corps: { unite?: unknown; chapitre?: unknown; question?: unknown };
  try {
    corps = await requete.json();
  } catch {
    return Response.json({ erreur: "Requête invalide." }, { status: 400 });
  }
  const { unite, chapitre } = corps;
  const question = typeof corps.question === "string" ? corps.question.trim() : "";
  if (typeof unite !== "string" || typeof chapitre !== "string" || question === "") {
    return Response.json({ erreur: "Requête invalide." }, { status: 400 });
  }
  if (question.length > LONGUEUR_QUESTION_MAX) {
    return Response.json(
      { erreur: `Ta question est trop longue (${LONGUEUR_QUESTION_MAX} caractères au plus).` },
      { status: 400 },
    );
  }

  const contexte = await contexteChapitre(utilisateur, unite, chapitre);
  if (!contexte) return Response.json({ erreur: "Chapitre inaccessible." }, { status: 404 });

  const resultat = await poserQuestion(contexte, question);
  if (!resultat.ok) return Response.json({ erreur: resultat.erreur }, { status: resultat.statut });
  return new Response(resultat.flux, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
