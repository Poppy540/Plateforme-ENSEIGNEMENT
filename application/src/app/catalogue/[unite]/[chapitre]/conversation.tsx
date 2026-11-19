"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CLE_QUESTIONS, useEnLigne, usePageInteractive } from "../../../composants/hors-ligne";

interface Echange {
  auteur: "eleve" | "professeur";
  contenu: string;
  /** Question posée sans réseau, en attente d'envoi (ADR 0044). */
  enAttente?: boolean;
}

/** Questions en attente, gardées sur l'appareil pour cette session et ce chapitre seulement. */
function lireAttente(cle: string): string[] {
  try {
    const brut = JSON.parse(localStorage.getItem(cle) ?? "[]");
    return Array.isArray(brut) ? brut.filter((q): q is string => typeof q === "string") : [];
  } catch {
    return [];
  }
}

function ecrireAttente(cle: string, questions: string[]) {
  try {
    if (questions.length === 0) localStorage.removeItem(cle);
    else localStorage.setItem(cle, JSON.stringify(questions.slice(0, 5)));
  } catch {
    // Stockage indisponible : la question n'est pas gardée.
  }
}

export function Conversation(props: {
  unite: string;
  chapitre: string;
  echanges: Echange[];
  nomProfesseur: string;
  /** Clé hors ligne de la session : les questions en attente d'une autre personne ne partent jamais. */
  session: string;
}) {
  const cleAttente = CLE_QUESTIONS(props.session, props.unite, props.chapitre);
  const [echanges, setEchanges] = useState<Echange[]>(props.echanges);
  const [question, setQuestion] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const enLigne = useEnLigne();
  // Sur réseau lent, la page s'affiche avant d'être interactive : bouton actif seulement ensuite.
  const interactive = usePageInteractive();
  const envoiEnCours = useRef(false);

  /** Envoie une question et affiche la réponse au fil de l'eau ; faux si le réseau manque. */
  const envoyerAuProfesseur = useCallback(
    async (texte: string): Promise<boolean> => {
      setEchanges((liste) => [
        ...liste,
        { auteur: "eleve", contenu: texte },
        { auteur: "professeur", contenu: "" },
      ]);
      let reponse: Response;
      try {
        reponse = await fetch("/api/professeur", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ unite: props.unite, chapitre: props.chapitre, question: texte }),
        });
      } catch {
        setEchanges((liste) => liste.slice(0, -2));
        return false;
      }
      if (!reponse.ok || !reponse.body) {
        const corps = await reponse.json().catch(() => ({}));
        setErreur(corps.erreur ?? "Le professeur n'est pas disponible pour le moment.");
        setEchanges((liste) => liste.slice(0, -1));
        return true;
      }
      try {
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
      }
      return true;
    },
    [props.unite, props.chapitre],
  );

  /** Au retour du réseau : les questions en attente partent une à une, dans l'ordre. */
  const viderAttente = useCallback(async () => {
    if (envoiEnCours.current) return;
    const attente = lireAttente(cleAttente);
    if (attente.length === 0) return;
    envoiEnCours.current = true;
    setEnCours(true);
    setEchanges((liste) => liste.filter((e) => !e.enAttente));
    try {
      for (const [i, texte] of attente.entries()) {
        if (!(await envoyerAuProfesseur(texte))) {
          const reste = attente.slice(i);
          ecrireAttente(cleAttente, reste);
          setEchanges((liste) => [
            ...liste,
            ...reste.map((contenu) => ({ auteur: "eleve" as const, contenu, enAttente: true })),
          ]);
          return;
        }
        ecrireAttente(cleAttente, attente.slice(i + 1));
      }
    } finally {
      envoiEnCours.current = false;
      setEnCours(false);
    }
  }, [cleAttente, envoyerAuProfesseur]);

  // Au chargement : questions en attente affichées (hors ligne) ou envoyées (réseau revenu). Les mises à
  // jour d'état ont lieu après une attente, jamais pendant le rendu de l'effet.
  useEffect(() => {
    let actif = true;
    void Promise.resolve().then(() => {
      if (!actif) return;
      if (enLigne) return viderAttente();
      const attente = lireAttente(cleAttente);
      if (attente.length > 0)
        setEchanges((liste) => [
          ...liste.filter((e) => !e.enAttente),
          ...attente.map((contenu) => ({ auteur: "eleve" as const, contenu, enAttente: true })),
        ]);
    });
    return () => {
      actif = false;
    };
  }, [enLigne, cleAttente, viderAttente]);

  function mettreEnAttente(texte: string) {
    ecrireAttente(cleAttente, [...lireAttente(cleAttente), texte]);
    setEchanges((liste) => [...liste, { auteur: "eleve", contenu: texte, enAttente: true }]);
  }

  async function envoyer(evenement: React.FormEvent) {
    evenement.preventDefault();
    const texte = question.trim();
    if (!texte || enCours) return;
    setErreur(null);
    setQuestion("");
    if (!navigator.onLine) {
      mettreEnAttente(texte);
      return;
    }
    setEnCours(true);
    try {
      if (!(await envoyerAuProfesseur(texte))) mettreEnAttente(texte);
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
          <li key={i} className={`echange echange-${e.auteur}${e.enAttente ? " en-attente" : ""}`}>
            <span className="auteur">{e.auteur === "eleve" ? "Toi" : props.nomProfesseur}</span>
            <p>{e.contenu || (enCours ? "…" : "")}</p>
            {e.enAttente && (
              <p className="note">En attente : ta question partira au retour du réseau.</p>
            )}
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
          disabled={!interactive}
        />
        <button type="submit" disabled={enCours || !interactive}>
          {enCours ? "Le professeur répond…" : enLigne ? "Envoyer" : "Garder pour plus tard"}
        </button>
      </form>
    </section>
  );
}
