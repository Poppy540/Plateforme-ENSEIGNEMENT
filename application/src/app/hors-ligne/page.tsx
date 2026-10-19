import { ChapitresGardes } from "../composants/hors-ligne";

// Page servie par le service worker quand le réseau manque et que la page demandée n'est pas enregistrée.
export default function PageHorsLigne() {
  return (
    <main className="conteneur">
      <h1>Pas de connexion</h1>
      <p>
        Cette page n&apos;est pas enregistrée sur ton appareil. Tu peux relire les chapitres déjà
        ouverts :
      </p>
      <ChapitresGardes />
      <p className="note">Dès que le réseau revient, recharge la page.</p>
    </main>
  );
}
