import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerEleveActif } from "@/lib/serveur/acces-eleve";
import { quizPourEleve } from "@/lib/serveur/evaluateur";
import { contexteChapitre, echangesDuChapitre, nomProfesseur } from "@/lib/serveur/professeur";
import { Conversation } from "./conversation";

export default async function PageChapitre({ params }: PageProps<"/catalogue/[unite]/[chapitre]">) {
  const utilisateur = await exigerEleveActif();
  const { unite, chapitre } = await params;
  const contexte = await contexteChapitre(utilisateur, unite, chapitre);
  if (!contexte) notFound();
  const echanges = await echangesDuChapitre(utilisateur, contexte.chapitreId);
  const quiz = await quizPourEleve(contexte);

  return (
    <main className="conteneur">
      <p>
        <Link href={`/catalogue/${unite}`}>← Chapitres</Link>
      </p>
      <h1>{contexte.chapitreTitre}</h1>
      <p className="note">
        La vidéo du cours arrivera au Jalon 2. En attendant, pose tes questions au professeur.
      </p>
      {quiz && (
        <p>
          <Link href={`/catalogue/${unite}/${chapitre}/quiz`}>
            {quiz.tentative
              ? `Quiz du chapitre : voir ma correction (score ${quiz.tentative.score} / 100)`
              : "Faire le quiz du chapitre"}
          </Link>
        </p>
      )}
      <Conversation
        unite={unite}
        chapitre={chapitre}
        echanges={echanges}
        nomProfesseur={nomProfesseur(contexte)}
      />
    </main>
  );
}
