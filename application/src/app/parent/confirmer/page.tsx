import { accepterInscription } from "./actions";

// Le lien ouvre cette page ; l'accord n'est enregistré qu'au clic sur le bouton (pas à la simple ouverture).
export default async function PageConfirmationParent({
  searchParams,
}: PageProps<"/parent/confirmer">) {
  const { jeton, resultat } = await searchParams;

  if (resultat === "accepte") {
    return (
      <main className="conteneur">
        <h1>Merci</h1>
        <p role="status">
          L&apos;inscription est acceptée. Le compte de votre enfant est maintenant actif.
        </p>
      </main>
    );
  }
  if (resultat === "invalide" || typeof jeton !== "string" || jeton === "") {
    return (
      <main className="conteneur">
        <h1>Lien invalide</h1>
        <p role="status">Ce lien n&apos;est pas valide ou a déjà été utilisé.</p>
      </main>
    );
  }
  return (
    <main className="conteneur">
      <h1>Accord du parent ou tuteur</h1>
      <p>
        Votre enfant demande à s&apos;inscrire sur une plateforme de cours en ligne du collège au
        lycée. Les cours sont présentés par des professeurs virtuels (intelligence artificielle) et
        relus par des enseignants.
      </p>
      <p>
        Nous enregistrons seulement : son prénom ou pseudonyme, sa classe, sa série, son
        établissement s&apos;il l&apos;a indiqué, sa progression, et votre contact pour cet accord.
      </p>
      <form action={accepterInscription}>
        <input type="hidden" name="jeton" value={jeton} />
        <button type="submit">J&apos;accepte l&apos;inscription</button>
      </form>
      <p className="note">Si vous ne connaissez pas cette demande, fermez simplement cette page.</p>
    </main>
  );
}
