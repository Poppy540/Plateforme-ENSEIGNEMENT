import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { identite } from "@/lib/identite";
import "./globals.css";

// Aucune police téléchargée : polices du système, pour économiser la bande passante.
export const metadata: Metadata = {
  title: identite.nom,
  description: identite.description,
  icons: { icon: "/icone.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: identite.couleurTheme,
};

// Rendu à chaque requête : le nonce de la politique de contenu (src/proxy.ts) change à chaque page servie ;
// une page pré-rendue porterait des scripts sans nonce, bloqués par le navigateur.
export default async function RootLayout({ children }: LayoutProps<"/">) {
  await connection();
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
