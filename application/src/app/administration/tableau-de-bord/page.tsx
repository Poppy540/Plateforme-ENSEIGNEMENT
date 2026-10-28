import Link from "next/link";
import { LIBELLES_PHASE, jour, type Phase } from "@/lib/pilote/tableau-de-bord";
import { exigerAdministrateur } from "@/lib/serveur/acces-administration";
import { decompteAttentes } from "@/lib/pilote/attentes";
import { attentesDuProprietaire } from "@/lib/serveur/attentes-proprietaire";
import { tableauDeBord } from "@/lib/serveur/tableau-de-bord";

// Tableau de bord du pilote (ADR 0088) : phase, décompte de chaque phase et prochaine action. Ne fait que lire
// les autres pages (conditions, critères, semaine, clôture), qui restent la référence.

const PHASES: Phase[] = ["preparation", "en_cours", "termine", "cloture"];

export default async function PageTableauDeBord() {
  const administrateur = await exigerAdministrateur();
  const [t, attentes] = await Promise.all([
    tableauDeBord(administrateur),
    attentesDuProprietaire(administrateur),
  ]);
  const { aFaire, aConfirmer } = decompteAttentes(attentes);

  return (
    <main className="conteneur">
      <p>
        <Link href="/administration">← Administration</Link>
      </p>
      <h1>Tableau de bord du pilote</h1>
      <p className="decompte pret">
        <strong>{LIBELLES_PHASE[t.phase]}</strong>
        {t.periode &&
          ` — du ${jour(t.periode.debut)}${t.periode.fin ? ` au ${jour(t.periode.fin)}` : ", sans date de fin"}`}
      </p>
      <section aria-labelledby="prochaine-action" className="encadre">
        <h2 id="prochaine-action">Prochaine action</h2>
        <p>{t.action.texte}</p>
        <p>
          <Link href={t.action.lien}>{t.action.libelleLien} →</Link>
        </p>
      </section>

      <section aria-labelledby="vous-attend" className="encadre">
        <h2 id="vous-attend">Ce qui vous attend</h2>
        <p>
          {aFaire} point{aFaire > 1 ? "s" : ""} à faire, {aConfirmer} à confirmer par vous.{" "}
          <Link href="/administration/attentes">Voir la liste complète →</Link>
        </p>
      </section>

      <h2>Les étapes du pilote</h2>
      <ol className="liste-cartes" aria-label="Étapes du pilote">
        {PHASES.map((p) => (
          <li
            key={p}
            className={`carte condition ${p === t.phase ? "remplie" : ""}`}
            aria-current={p === t.phase ? "step" : undefined}
          >
            <h3>
              {LIBELLES_PHASE[p]}
              {p === t.phase && " (étape actuelle)"}
            </h3>
            {p === "preparation" && (
              <p>
                Conditions du pilote :{" "}
                <strong>
                  {t.conditions.remplies} / {t.conditions.total}
                </strong>{" "}
                — <Link href="/administration/conditions">Conditions du pilote</Link>
              </p>
            )}
            {p === "en_cours" && (
              <>
                <p>
                  Critères de suspension :{" "}
                  <strong>
                    {t.criteres.atteints} atteint{t.criteres.atteints > 1 ? "s" : ""},{" "}
                    {t.criteres.aExaminer} à examiner
                  </strong>{" "}
                  — <Link href="/administration/criteres">Critères de suspension</Link>
                </p>
                {t.semaine && (
                  <dl className="chiffres">
                    <div>
                      <dt>Élèves actifs (7 jours)</dt>
                      <dd>{t.semaine.elevesActifs}</dd>
                    </div>
                    <div>
                      <dt>Quiz passés</dt>
                      <dd>{t.semaine.quiz}</dd>
                    </div>
                    <div>
                      <dt>Signalements</dt>
                      <dd>{t.semaine.signalements}</dd>
                    </div>
                  </dl>
                )}
                <p>
                  <Link href="/administration/semaine">Semaine du pilote</Link> ·{" "}
                  <Link href="/administration/journal">Journal du pilote</Link>
                </p>
              </>
            )}
            {p === "termine" && (
              <p>
                Gestes de clôture :{" "}
                <strong>
                  {t.cloture.faits} / {t.cloture.total}
                </strong>{" "}
                — <Link href="/administration/cloture">Clôture du pilote</Link> ·{" "}
                <Link href="/administration/fin-pilote">Rapport de fin</Link>
              </p>
            )}
            {p === "cloture" && (
              <p>
                <Link href="/administration/donnees">Sort des données</Link> (simulation)
              </p>
            )}
          </li>
        ))}
      </ol>
    </main>
  );
}
