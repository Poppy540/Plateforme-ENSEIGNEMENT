import Link from "next/link";
import { contexteEleve } from "@/lib/serveur/catalogue";
import { optionsInscription } from "@/lib/serveur/requetes";
import { utilisateurConnecte } from "@/lib/serveur/session";
import { accesElevesOuvert } from "@/lib/serveur/disponibilite";
import { faqDuSite, LONGUEUR_MESSAGE_MAX } from "@/lib/serveur/support";
import { FormulaireAide } from "./formulaire";

export default async function PageAide({ searchParams }: PageProps<"/aide">) {
  const utilisateur = await utilisateurConnecte();
  const { referentiel } = await searchParams;
  const { referentiels } = await optionsInscription();
  // Un élève inscrit voit toujours l'aide de son pays ; sinon, le pays se choisit quand il y en a plusieurs.
  const eleve = utilisateur ? await contexteEleve(utilisateur) : null;
  const choisi = typeof referentiel === "string" ? referentiel : null;
  const courant = referentiels.find((r) => r.code === choisi) ?? referentiels[0];
  const faq = await faqDuSite(utilisateur, eleve ? null : (courant?.code ?? null));
  const ouvert = await accesElevesOuvert();

  return (
    <main className="conteneur">
      <p>
        <Link href={utilisateur ? "/espace" : "/"}>← Retour</Link>
      </p>
      <h1>Aide</h1>
      {!eleve && referentiels.length > 1 && (
        <p>
          Pays :{" "}
          {referentiels.map((r) => (
            <Link
              key={r.code}
              href={`/aide?referentiel=${encodeURIComponent(r.code)}`}
              aria-current={r.code === courant?.code ? "page" : undefined}
            >
              {r.pays}{" "}
            </Link>
          ))}
        </p>
      )}
      {faq.statut !== "validee" && (
        <p className="note">Questions fréquentes provisoires, en cours de validation.</p>
      )}

      <h2>Questions fréquentes</h2>
      {faq.entrees.length === 0 ? (
        <p>Pas encore de questions fréquentes.</p>
      ) : (
        faq.entrees.map((e) => (
          <details key={e.id}>
            <summary>{e.question}</summary>
            <p>{e.reponse}</p>
          </details>
        ))
      )}

      <h2>Poser une question</h2>
      {!ouvert ? (
        <p role="status">L&apos;assistant d&apos;aide est momentanément indisponible.</p>
      ) : utilisateur ? (
        <>
          <p className="note">
            L&apos;assistant d&apos;aide est une intelligence artificielle. Il répond à partir des
            questions fréquentes ; sinon, il transmet ta demande à une personne de l&apos;équipe. La
            conversation n&apos;est pas enregistrée.
          </p>
          <FormulaireAide
            longueurMax={LONGUEUR_MESSAGE_MAX}
            referentiel={eleve ? null : (courant?.code ?? null)}
          />
        </>
      ) : (
        <p>
          <Link href="/connexion">Connecte-toi</Link> pour poser une question à l&apos;assistant
          d&apos;aide.
        </p>
      )}
    </main>
  );
}
