import type { MetadataRoute } from "next";
import { identite } from "@/lib/identite";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: identite.nom,
    short_name: identite.nomCourt,
    description: identite.description,
    lang: "fr",
    start_url: "/",
    display: "standalone",
    background_color: identite.couleurFond,
    theme_color: identite.couleurTheme,
    icons: [{ src: "/icone.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
