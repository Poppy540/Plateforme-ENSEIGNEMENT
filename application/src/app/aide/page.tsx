import Link from "next/link";
import { utilisateurConnecte } from "@/lib/serveur/session";
import { accesElevesOuvert } from "@/lib/serveur/disponibilite";
import { faqDuSite, LONGUEUR_MESSAGE_MAX } from "@/lib/serveur/support";
import { FormulaireAide } from "./formulaire";

export default async function PageAide() {
  const utilisateur = await utilisateurConnecte();
  const faq = await faqDuSite(utilisateur);
  const ouvert = await accesElevesOuvert();

  return (
    <main className="conteneur">
      <p>
        <Link href={utilisateur ? "/espace" : "/"}>← Retour</Link>
      </p>
      <h1>Aide</h1>
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
          <FormulaireAide longueurMax={LONGUEUR_MESSAGE_MAX} />
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
