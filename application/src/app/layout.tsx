import type { Metadata, Viewport } from "next";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
