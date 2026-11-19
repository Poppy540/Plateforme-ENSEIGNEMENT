import type { NextConfig } from "next";

// En-têtes de sécurité (revue de sécurité, ADR 0043) : pas d'affichage dans un cadre d'un autre site
// (clics détournés sur « valider », « publier », « j'accepte »), aucune adresse transmise à un autre site
// (les liens des parents portent un jeton), pas de devinette de type de fichier. La politique de contenu, à
// nonce, est posée par src/proxy.ts sur chaque page (ADR 0049).
const nextConfig: NextConfig = {
  // Paquet de déploiement (ADR 0076) : serveur autonome, construit seulement par `pnpm paquet`. Le développement,
  // les tests et `pnpm start` gardent la construction habituelle.
  ...(process.env.SORTIE_AUTONOME === "1" ? { output: "standalone" as const } : {}),
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      // Routes d'API (JSON, fichiers) : rien ne s'y exécute.
      {
        source: "/api/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: "default-src 'none'; frame-ancestors 'none'" },
        ],
      },
    ];
  },
};

export default nextConfig;
