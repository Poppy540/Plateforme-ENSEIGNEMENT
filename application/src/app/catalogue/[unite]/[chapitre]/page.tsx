import Link from "next/link";
import { notFound } from "next/navigation";
import { exigerEleveActif } from "@/lib/serveur/acces-eleve";
import { estSimulee, sourcesLecture } from "@/lib/production-video/lecture";
import { sousDomaineStream } from "@/lib/serveur/production-video";
import { quizPourEleve } from "@/lib/serveur/evaluateur";
import { videoDuChapitre } from "@/lib/serveur/videos";
import { LecteurVideo } from "../../../composants/lecteur-video";
import { LeconEcrite } from "../../../composants/lecon-ecrite";
import { leconDuChapitre } from "@/lib/serveur/lecons";
import { contexteChapitre, echangesDuChapitre, nomProfesseur } from "@/lib/serveur/professeur";
import { cleHorsLigne } from "@/lib/serveur/cle-hors-ligne";
import { Conversation } from "./conversation";

export default async function PageChapitre({ params }: PageProps<"/catalogue/[unite]/[chapitre]">) {
  const utilisateur = await exigerEleveActif();
  const { unite, chapitre } = await params;
  const contexte = await contexteChapitre(utilisateur, unite, chapitre);
  if (!contexte) notFound();
  const echanges = await echangesDuChapitre(utilisateur, contexte.chapitreId);
  const quiz = await quizPourEleve(contexte);
  const [video, lecon] = await Promise.all([videoDuChapitre(contexte), leconDuChapitre(contexte)]);

  return (
    <main className="conteneur">
      <p>
        <Link href={`/catalogue/${unite}`}>← Chapitres</Link>
      </p>
      <h1>{contexte.chapitreTitre}</h1>
      {video ? (
        <LecteurVideo
          chapitreId={contexte.chapitreId}
          videoId={video.id}
          sources={sourcesLecture(video.reference, video.versions, {
            sousDomaineStream: sousDomaineStream(),
          })}
          dureeSecondes={video.dureeSecondes}
          sousTitres={video.aDesSousTitres}
          simulation={estSimulee(video.reference)}
        />
      ) : (
        <p className="note">
          La vidéo de ce chapitre n&apos;est pas encore publiée.{" "}
          {lecon ? "Lis la leçon écrite" : "En attendant, pose tes questions au professeur"}.
        </p>
      )}
      {lecon && <LeconEcrite lecon={lecon} ouverte={!video} chapitreId={contexte.chapitreId} />}
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
        session={cleHorsLigne(utilisateur)}
      />
    </main>
  );
}
