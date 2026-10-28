import Link from "next/link";
import { THEMES, decompteAttentes, type EtatAttente, type Theme } from "@/lib/pilote/attentes";
import { exigerAdministrateur } from "@/lib/serveur/acces-administration";
import { attentesDuProprietaire } from "@/lib/serveur/attentes-proprietaire";

// Ce qui vous attend (ADR 0089) : une liste unique, tirée des bilans ; état calculé quand la plateforme le voit,
// sinon « à confirmer par vous » (docs/attentes-proprietaire.md).

const ETATS: Record<EtatAttente, string> = {
  fait: "Fait",
  a_faire: "À faire",
  a_confirmer: "À confirmer par vous",
};

export default async function PageAttentes() {
  const administrateur = await exigerAdministrateur();
  const attentes = await attentesDuProprietaire(administrateur);
  const { faits, aFaire, aConfirmer } = decompteAttentes(attentes);

  return (
    <main className="conteneur">
      <p>
        <Link href="/administration">← Administration</Link>
      </p>
      <h1>Ce qui vous attend</h1>
      <p className="note">
        Tout ce que les bilans des jalons vous demandent, au même endroit. La plateforme vérifie
        elle-même les points qu&apos;elle peut voir ; les autres sont « à confirmer par vous » et se
        suivent dans docs/attentes-proprietaire.md.
      </p>
      <p className="decompte">
        <strong>
          {aFaire} à faire, {aConfirmer} à confirmer par vous
        </strong>
        , {faits} fait{faits > 1 ? "s" : ""}.
      </p>
      {(Object.keys(THEMES) as Theme[]).map((theme) => (
        <section key={theme} aria-labelledby={`theme-${theme}`}>
          <h2 id={`theme-${theme}`}>{THEMES[theme]}</h2>
          <ul className="liste-cartes" aria-label={THEMES[theme]}>
            {attentes
              .filter((a) => a.theme === theme)
              .map((a) => (
                <li
                  key={a.code}
                  id={`attente-${a.code}`}
                  className={`carte condition ${a.etat === "fait" ? "remplie" : ""}`}
                >
                  <h3>{a.titre}</h3>
                  <p>
                    <strong>{ETATS[a.etat]}</strong>
                    {a.etat !== "a_confirmer" && " — vérifié par la plateforme"}
                  </p>
                  <p className="note">Où : {a.ou}</p>
                  <p className="note">Débloque : {a.debloque}</p>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
