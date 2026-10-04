"use client";

import { useState } from "react";

interface Echange {
  auteur: "eleve" | "professeur";
  contenu: string;
}

export function Conversation(props: {
  unite: string;
  chapitre: string;
  echanges: Echange[];
  nomProfesseur: string;
}) {
  const [echanges, setEchanges] = useState<Echange[]>(props.echanges);
  const [question, setQuestion] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function envoyer(evenement: React.FormEvent) {
    evenement.preventDefault();
    const texte = question.trim();
    if (!texte || enCours) return;
    setErreur(null);
    setEnCours(true);
    setQuestion("");
    setEchanges((liste) => [
      ...liste,
      { auteur: "eleve", contenu: texte },
      { auteur: "professeur", contenu: "" },
    ]);
    try {
      const reponse = await fetch("/api/professeur", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ unite: props.unite, chapitre: props.chapitre, question: texte }),
      });
      if (!reponse.ok || !reponse.body) {
        const corps = await reponse.json().catch(() => ({}));
        setErreur(corps.erreur ?? "Le professeur n'est pas disponible pour le moment.");
        setEchanges((liste) => liste.slice(0, -1));
        return;
      }
      const lecteur = reponse.body.getReader();
      const decodeur = new TextDecoder();
      for (;;) {
        const { value, done } = await lecteur.read();
        if (done) break;
        const morceau = decodeur.decode(value, { stream: true });
        setEchanges((liste) => {
          const copie = [...liste];
          const dernier = copie[copie.length - 1];
          copie[copie.length - 1] = { ...dernier, contenu: dernier.contenu + morceau };
          return copie;
        });
      }
    } catch {
      setErreur("Connexion interrompue. Réessaie.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <section aria-label="Conversation avec le professeur" className="conversation">
      <p className="note">
        {props.nomProfesseur} est une intelligence artificielle. Elle t&apos;aide à comprendre, elle
        ne fait pas tes devoirs à ta place. Ne donne pas d&apos;informations personnelles.
      </p>
      <ol className="echanges" aria-live="polite">
        {echanges.map((e, i) => (
          <li key={i} className={`echange echange-${e.auteur}`}>
            <span className="auteur">{e.auteur === "eleve" ? "Toi" : props.nomProfesseur}</span>
            <p>{e.contenu || (enCours ? "…" : "")}</p>
          </li>
        ))}
      </ol>
      {erreur && (
        <p role="alert" className="erreur">
          {erreur}
        </p>
      )}
      <form onSubmit={envoyer} className="formulaire">
        <label htmlFor="question">Ta question</label>
        <textarea
          id="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
          maxLength={1000}
          required
        />
        <button type="submit" disabled={enCours}>
          {enCours ? "Le professeur répond…" : "Envoyer"}
        </button>
      </form>
    </section>
  );
}
