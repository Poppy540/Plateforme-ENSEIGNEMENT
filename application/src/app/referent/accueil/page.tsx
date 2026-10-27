import Link from "next/link";
import { exigerReferent } from "@/lib/serveur/acces-referent";
import { accueilVu } from "@/lib/serveur/pilote";
import { commencer } from "./actions";

// Accueil du référent (ADR 0070) : proposé en tête de son espace tant qu'il ne l'a pas fermé, toujours accessible.

const ETAPES = [
  [
    "Programme des chapitres",
    "Comparer titre et sous-thèmes au programme officiel, puis valider ou rejeter.",
    "5 à 10 min par chapitre",
  ],
  ["Liens de prérequis", "Dire si « ce chapitre demande celui-là » est juste.", "2 min par lien"],
  [
    "Script de cours",
    "Faire rédiger un brouillon, le lire en entier, vérifier les points [À VÉRIFIER], puis valider ou demander une révision. Le script validé devient aussi la leçon écrite des élèves.",
    "20 à 40 min par chapitre",
  ],
  [
    "Quiz",
    "Faire créer un quiz, vérifier chaque question, sa bonne réponse et son explication.",
    "10 à 20 min par chapitre",
  ],
  [
    "Vidéo (facultatif)",
    "Quand la vidéo existe : la regarder en entier avec les sous-titres, valider, puis publier.",
    "durée de la vidéo + 5 min",
  ],
] as const;

export default async function PageAccueilReferent() {
  const referent = await exigerReferent();
  const dejaVu = await accueilVu(referent);
  return (
    <main className="conteneur">
      <h1>Bienvenue dans l&apos;espace référent</h1>
      <p>
        Rien n&apos;arrive aux élèves sans votre validation. Les agents (des intelligences
        artificielles) préparent des <strong>brouillons</strong> ; vous les lisez, puis vous
        validez, demandez une révision ou rejetez.
      </p>
      <h2>Par où commencer</h2>
      <p>
        Les <strong>chapitres du pilote</strong> sont en tête de votre espace, avec pour chacun la
        prochaine action à faire. Commencez par eux : ce sont ceux que les élèves de la classe
        pilote verront en premier.
      </p>
      <h2>Pour chaque chapitre, dans cet ordre</h2>
      <ol className="liste-cartes">
        {ETAPES.map(([titre, texte, duree], i) => (
          <li key={titre} className="carte">
            <strong>
              {i + 1}. {titre}
            </strong>
            <span>{texte}</span>
            <span className="note">Temps indicatif : {duree}</span>
          </li>
        ))}
      </ol>
      <h2>À garder en tête</h2>
      <ul>
        <li>
          Vous ne voyez aucun élève : ni nom, ni message. La détresse est traitée par l&apos;équipe
          de veille.
        </li>
        <li>
          Une validation porte sur la version lue : si le contenu change, il revient vers vous.
        </li>
        <li>
          Un doute sur le programme officiel ? Rejetez avec un commentaire, ou déposez le document
          dans « Conformité ».
        </li>
      </ul>
      {dejaVu ? (
        <p>
          <Link href="/referent" className="bouton">
            Retour à mon espace
          </Link>
        </p>
      ) : (
        <form action={commencer}>
          <button type="submit">Commencer</button>
        </form>
      )}
    </main>
  );
}
