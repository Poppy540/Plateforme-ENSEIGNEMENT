import { NextResponse, type NextRequest } from "next/server";
import { nouveauNonce, politiqueDeContenu } from "@/lib/politique-contenu";

// Politique de contenu à nonce (revue de sécurité D8, ADR 0049) : un nonce par requête de page, lu par Next.js
// dans l'en-tête de la requête et posé sur ses propres scripts. Aucune autre logique ici (l'accès est vérifié
// dans chaque page, action et route).
export function proxy(requete: NextRequest) {
  const politique = politiqueDeContenu(nouveauNonce(), process.env.NODE_ENV === "development");
  const entetes = new Headers(requete.headers);
  entetes.set("Content-Security-Policy", politique);
  const reponse = NextResponse.next({ request: { headers: entetes } });
  reponse.headers.set("Content-Security-Policy", politique);
  return reponse;
}

export const config = {
  matcher: [
    {
      source:
        "/((?!api|_next/static|_next/image|favicon.ico|icone.svg|sw.js|manifest.webmanifest|simulation/).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
