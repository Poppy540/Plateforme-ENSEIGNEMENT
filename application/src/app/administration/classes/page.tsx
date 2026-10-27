import Link from "next/link";
import { exigerAdministrateur } from "@/lib/serveur/acces-administration";
import { classesAdministration, optionsClasse } from "@/lib/serveur/classes-administration";
import { annulerInvitations } from "./actions";
import { ActionsCode, FormulaireClasse } from "./formulaires";

// Classes du pilote (ADR 0063, 0067) : création, liste sans les codes, nouveaux codes, annulation.

const formatDate = new Intl.DateTimeFormat("fr", { dateStyle: "short" });

export default async function PageClasses() {
  const administrateur = await exigerAdministrateur();
  const [options, classes] = await Promise.all([
    optionsClasse(administrateur),
    classesAdministration(administrateur),
  ]);

  return (
    <main className="conteneur">
      <p>
        <Link href="/administration">← Administration</Link>
      </p>
      <h1>Classes du pilote</h1>
      <p role="note" className="attente">
        Avant de créer une vraie classe, attendez l&apos;avis du juriste sur le suivi par
        l&apos;enseignant (question Q19 du dossier). L&apos;enseignant ne verra que des chiffres
        d&apos;ensemble de sa classe, jamais rien sous 5 élèves.
      </p>
      {options.map((o) => (
        <section key={o.referentiel} aria-labelledby={`ref-${o.referentiel}`}>
          <h2 id={`ref-${o.referentiel}`}>Nouvelle classe — référentiel {o.referentiel}</h2>
          <FormulaireClasse option={o} />
        </section>
      ))}

      <h2>Classes ({classes.length})</h2>
      {classes.length === 0 && <p>Aucune classe pour l&apos;instant.</p>}
      <ul className="liste-cartes">
        {classes.map((c) => (
          <li key={c.id} className="carte">
            <strong>
              {c.nom} — {c.etablissement}
            </strong>
            <span className="note">
              {c.referentiel}, {c.niveau}
              {c.serie ? `, série ${c.serie}` : ""}
            </span>
            <span>
              Élèves rattachés : <strong>{c.eleves}</strong>
            </span>
            <span>
              Code de classe :{" "}
              {c.code_valide ? `valable jusqu'au ${formatDate.format(c.code_expire_le)}` : "expiré"}
            </span>
            <span>
              Enseignant :{" "}
              {c.enseignants.length > 0 ? c.enseignants.join(", ") : "pas encore activé"}
              {c.invitation_en_attente ? " ; invitation en attente" : ""}
            </span>
            <ActionsCode classe={c.id} nom={c.nom} />
            {c.invitation_en_attente && (
              <form action={annulerInvitations}>
                <input type="hidden" name="classe" value={c.id} />
                <button
                  type="submit"
                  className="secondaire"
                  aria-label={`Annuler l'invitation en attente pour la classe ${c.nom}`}
                >
                  Annuler l&apos;invitation en attente
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
