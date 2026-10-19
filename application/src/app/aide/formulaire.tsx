"use client";

import Link from "next/link";
import { useActionState } from "react";
import { poserQuestion } from "./actions";

export function FormulaireAide({
  longueurMax,
  referentiel,
}: {
  longueurMax: number;
  referentiel: string | null;
}) {
  const [etat, action, enCours] = useActionState(poserQuestion, undefined);
  return (
    <>
      <form action={action} className="formulaire">
        {referentiel && <input type="hidden" name="referentiel" value={referentiel} />}
        <label htmlFor="question">Ta question</label>
        <textarea
          id="question"
          name="question"
          rows={3}
          maxLength={longueurMax}
          required
          placeholder="Par exemple : je ne reçois pas le code, comment choisir ma série…"
        />
        <p className="note">
          Ne donne jamais ton code de connexion ni un mot de passe : personne ne te les demandera.
        </p>
        {etat?.erreur && (
          <p role="alert" className="erreur">
            {etat.erreur}
          </p>
        )}
        <div className="actions">
          <button type="submit" disabled={enCours}>
            {enCours ? "Réponse en cours…" : "Envoyer"}
          </button>
        </div>
      </form>
      {etat?.reponse && (
        <section aria-label="Réponse de l'assistant">
          <p className="note">Ta question : {etat.question}</p>
          {etat.reponse.split("\n\n").map((paragraphe, i) => (
            <p key={i}>{paragraphe}</p>
          ))}
          {etat.ticket && (
            <p role="status">
              Ta demande a été transmise à l&apos;équipe : une personne te répondra.
            </p>
          )}
          {etat.orientationProfesseur && (
            <p role="status">
              Pour une question de cours, ouvre le chapitre dans{" "}
              <Link href="/catalogue">Mes cours</Link> et pose-la au professeur de la matière.
            </p>
          )}
        </section>
      )}
    </>
  );
}
