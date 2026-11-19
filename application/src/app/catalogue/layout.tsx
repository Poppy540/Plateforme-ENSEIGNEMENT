import { cleHorsLigne } from "@/lib/serveur/cle-hors-ligne";
import { utilisateurConnecte } from "@/lib/serveur/session";
import { BandeauHorsLigne, EnregistrementHorsLigne } from "../composants/hors-ligne";

// Pages de l'élève : service worker et clé de session (lecture hors ligne des chapitres ouverts, ADR 0044).
export default async function MiseEnPageCatalogue({ children }: LayoutProps<"/catalogue">) {
  const utilisateur = await utilisateurConnecte();
  return (
    <>
      {utilisateur && <EnregistrementHorsLigne cle={cleHorsLigne(utilisateur)} />}
      <BandeauHorsLigne />
      {children}
    </>
  );
}
