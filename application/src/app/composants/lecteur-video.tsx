"use client";

import { useRef, useState } from "react";
import { formaterDuree } from "@/lib/format";
import { megaOctetsParMinute, type SourceLecture } from "@/lib/production-video/lecture";

// Lecteur adapté aux connexions lentes (ADR 0026) : rien n'est téléchargé avant « lecture » (preload="none"),
// version la plus légère par défaut, consommation affichée, sous-titres français activés.

export function LecteurVideo({
  videoId,
  sources,
  dureeSecondes,
  sousTitres,
  simulation,
}: {
  videoId: string;
  sources: SourceLecture[] | null;
  dureeSecondes: number;
  sousTitres: boolean;
  simulation: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [indice, setIndice] = useState(0);

  if (!sources || sources.length === 0)
    return (
      <p className="note">
        Lecture indisponible : l&apos;hébergement vidéo n&apos;est pas encore branché.
      </p>
    );
  const source = sources[indice];

  function changerQualite(i: number) {
    const instant = video.current?.currentTime ?? 0;
    const enLecture = video.current ? !video.current.paused : false;
    setIndice(i);
    requestAnimationFrame(() => {
      if (!video.current) return;
      video.current.currentTime = instant;
      if (enLecture) void video.current.play();
    });
  }

  return (
    <figure className="lecteur">
      <video
        ref={video}
        key={source.qualite}
        controls
        preload="none"
        playsInline
        width={426}
        height={240}
        aria-label="Vidéo du cours"
      >
        {source.fichiers.map((f) => (
          <source key={f.url} src={f.url} type={f.type} />
        ))}
        {sousTitres && (
          <track
            kind="subtitles"
            srcLang="fr"
            label="Français"
            src={`/api/videos/${videoId}/sous-titres`}
            default
          />
        )}
      </video>
      <figcaption>
        <label>
          Qualité{" "}
          <select
            value={indice}
            onChange={(e) => changerQualite(Number(e.target.value))}
            aria-label="Qualité de la vidéo"
          >
            {sources.map((s, i) => (
              <option key={s.qualite} value={i}>
                {s.qualite} (~{megaOctetsParMinute(s.debitKbps)} Mo/min)
              </option>
            ))}
          </select>
        </label>{" "}
        <span className="note">
          Durée : {formaterDuree(dureeSecondes)}· la vidéo ne se charge qu&apos;au lancement.
          {simulation && " Vidéo simulée (aucun fournisseur vidéo choisi)."}
        </span>
      </figcaption>
    </figure>
  );
}
