import type { NextConfig } from "next";

// En-têtes de sécurité (revue de sécurité, ADR 0043) : pas d'affichage dans un cadre d'un autre site
// (clics détournés sur « valider », « publier », « j'accepte »), aucune adresse transmise à un autre site
// (les liens des parents portent un jeton), pas de devinette de type de fichier, sources limitées au site.
// Les scripts en ligne de Next.js imposent 'unsafe-inline' ; 'unsafe-eval' seulement en développement.
const developpement = process.env.NODE_ENV === "development";
const politiqueDeContenu = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${developpement ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob: https:",
  "connect-src 'self'",
  "font-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: politiqueDeContenu },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
