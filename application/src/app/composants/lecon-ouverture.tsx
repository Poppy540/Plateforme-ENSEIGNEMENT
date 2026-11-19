"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { signalerLecture } from "./compteur";

/** Bloc dépliable de la leçon écrite : son ouverture compte une fois par page (compteur agrégé, ADR 0052). */
export function LeconDepliable({
  chapitreId,
  ouverte,
  children,
}: {
  chapitreId: string;
  ouverte: boolean;
  children: ReactNode;
}) {
  const compte = useRef(false);
  const noter = () => {
    if (compte.current) return;
    compte.current = true;
    signalerLecture(chapitreId, "lecon_ouverte");
  };
  useEffect(() => {
    // Ouverte d'emblée (pas de vidéo) et lue en ligne : comptée une fois.
    if (ouverte && navigator.onLine) noter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <details
      className="lecon"
      open={ouverte}
      onToggle={(e) => {
        if ((e.currentTarget as HTMLDetailsElement).open) noter();
      }}
    >
      {children}
    </details>
  );
}
