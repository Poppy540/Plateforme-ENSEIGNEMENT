import Link from "next/link";
import { exigerAdministrateur } from "@/lib/serveur/acces-administration";
import { sortDesDonnees } from "@/lib/serveur/sort-donnees";

// Sort des données en fin de pilote (ADR 0086) : SIMULATION seulement. La purge planifiée existante (ADR 0019,
// 0049) reste la seule à effacer, selon les durées du pack validées par le juriste. Aucune donnée individuelle.

export default async function PageSortDesDonnees() {
  const administrateur = await exigerAdministrateur();
  const { finPilote, avisJuriste, simulations } = await sortDesDonnees(administrateur);

  return (
    <main className="conteneur">
      <p>
        <Link href="/administration">← Administration</Link>
      </p>
      <h1>Sort des données</h1>
      <p role="note" className="decompte">
        <strong>Simulation seulement : rien n&apos;est effacé ici.</strong> Seule la purge planifiée
        efface, selon les durées du pack pays (cadre légal, conservation).
        {avisJuriste
          ? " L'avis du juriste est coché (condition 1) : vérifiez que les durées du pack sont celles qu'il a validées."
          : " L'avis du juriste n'est pas encore coché (condition 1) : les durées du pack restent provisoires."}
      </p>
      <p className="note">
        Pour chaque catégorie : sa durée, le nombre actuel, ce que la purge effacerait si elle
        passait aujourd&apos;hui, et la date à laquelle toutes les données du pilote auront dépassé
        leur durée (dernier jour du pilote{finPilote ? "" : ", non saisi"} + durée). Les familles
        qui veulent garder leur compte le gardent : seules les durées ordinaires s&apos;appliquent ;
        elles peuvent aussi le supprimer à tout moment depuis « Mes données ». Les effectifs de 1 à
        4 personnes s&apos;affichent « &lt;5 ».
      </p>
      {simulations.length === 0 && (
        <p>
          Aucun chapitre du pilote désigné : pays du pilote inconnu (
          <Link href="/administration/pilote">Chapitres du pilote</Link>).
        </p>
      )}
      {simulations.map((s) => (
        <section key={s.pays}>
          <h2>Pays du pilote : {s.pays}</h2>
          <ul className="liste-cartes" aria-label={`Simulation du sort des données — ${s.pays}`}>
            {s.categories.map((c) => (
              <li key={c.categorie} className="carte">
                <strong>{c.libelle}</strong>
                <span className="note">{c.regle}</span>
                <dl className="chiffres">
                  <div>
                    <dt>Durée</dt>
                    <dd>{c.duree}</dd>
                  </div>
                  <div>
                    <dt>Aujourd&apos;hui</dt>
                    <dd>{c.total}</dd>
                  </div>
                  <div>
                    <dt>Effacé si la purge passait aujourd&apos;hui</dt>
                    <dd>{c.aEffacer}</dd>
                  </div>
                  <div>
                    <dt>Date prévue (fin du pilote + durée)</dt>
                    <dd>{c.datePrevue}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
