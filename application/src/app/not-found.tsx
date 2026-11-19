import Link from "next/link";

export default function PageIntrouvable() {
  return (
    <main className="conteneur">
      <h1>Page introuvable</h1>
      <p>Cette page n&apos;existe pas ou n&apos;est pas accessible.</p>
      <p>
        <Link href="/">Retour à l&apos;accueil</Link>
      </p>
    </main>
  );
}
