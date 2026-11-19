import { accepterRapports } from "./actions";

// Le lien ouvre cette page ; l'accord n'est enregistré qu'au clic sur le bouton (pas à la simple ouverture).
export default async function PageAccordRapports({
  searchParams,
}: PageProps<"/parent/rapports/accord">) {
  const { jeton, resultat } = await searchParams;
  if (resultat === "accepte")
    return (
      <main className="conteneur">
        <h1>Merci</h1>
        <p role="status">
          Vous recevrez un court rapport chaque semaine. Chaque rapport contient un lien pour en
          demander un autre ou pour arrêter.
        </p>
      </main>
    );
  if (resultat === "invalide" || typeof jeton !== "string" || jeton === "")
    return (
      <main className="conteneur">
        <h1>Lien invalide</h1>
        <p role="status">Ce lien n&apos;est pas valide ou a déjà été utilisé.</p>
      </main>
    );
  return (
    <main className="conteneur">
      <h1>Rapports sur la progression de votre enfant</h1>
      <p>
        Votre enfant vous propose de recevoir chaque semaine, par message, un court rapport rédigé
        par son tuteur (une intelligence artificielle) : sa progression, ses points forts, ce
        qu&apos;il peut renforcer. Jamais de comparaison avec d&apos;autres élèves, jamais de
        diagnostic.
      </p>
      <p>Vous ou votre enfant pouvez arrêter à tout moment.</p>
      <form action={accepterRapports}>
        <input type="hidden" name="jeton" value={jeton} />
        <button type="submit">J&apos;accepte de recevoir les rapports</button>
      </form>
      <p className="note">Si vous ne connaissez pas cette demande, fermez simplement cette page.</p>
    </main>
  );
}
