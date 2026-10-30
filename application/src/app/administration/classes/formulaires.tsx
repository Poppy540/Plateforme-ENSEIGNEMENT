"use client";

import { useActionState } from "react";
import type { OptionClasse, ResultatCodes } from "@/lib/serveur/classes-administration";
import { codeClasse, creer, invitationEnseignant } from "./actions";

// Les codes n'existent que dans la réponse de l'action, affichée ici une seule fois.
function Codes({ etat }: { etat: ResultatCodes | undefined }) {
  if (!etat) return null;
  if (!etat.ok)
    return (
      <p role="alert" className="erreur">
        {etat.erreur}
      </p>
    );
  return (
    <div role="status" className="code-unique">
      {etat.codeClasse && (
        <p>
          Code de la classe, pour les élèves : <strong className="code">{etat.codeClasse}</strong>
        </p>
      )}
      {etat.codeEnseignant && (
        <p>
          Code d&apos;invitation de l&apos;enseignant, personnel :{" "}
          <strong className="code">{etat.codeEnseignant}</strong>
        </p>
      )}
      <p>
        Notez-les maintenant : ils ne seront <strong>plus jamais affichés</strong>. Transmettez-les
        à l&apos;enseignant par un canal sûr. Il active son accès sur la page « Accès enseignant de
        la classe » et donne le code de la classe à ses élèves.
      </p>
    </div>
  );
}

export function FormulaireClasse({ option }: { option: OptionClasse }) {
  const [etat, action, enCours] = useActionState(creer, undefined);
  const id = (nom: string) => `${option.referentiel}-${nom}`;
  return (
    <form action={action} className="formulaire">
      <input type="hidden" name="referentiel" value={option.referentiel} />
      <label htmlFor={id("niveau")}>Niveau</label>
      <select id={id("niveau")} name="niveau" required>
        {option.niveaux.map((n) => (
          <option key={n.code} value={n.code}>
            {n.libelle}
          </option>
        ))}
      </select>
      <label htmlFor={id("serie")}>Série (facultatif)</label>
      <select id={id("serie")} name="serie" defaultValue="">
        <option value="">Aucune</option>
        {option.series.map((s) => (
          <option key={s.code} value={s.code}>
            {s.libelle}
          </option>
        ))}
      </select>
      <label htmlFor={id("nom")}>Nom de la classe (par exemple « 3e A »)</label>
      <input id={id("nom")} name="nom" maxLength={60} required />
      <label htmlFor={id("etablissement")}>Établissement</label>
      <input id={id("etablissement")} name="etablissement" maxLength={120} required />
      <label htmlFor={id("capacite")}>
        Capacité de la classe (effectif annoncé, 1 à 200) : au-delà, le code est refusé
      </label>
      <input id={id("capacite")} name="capacite" type="number" min={1} max={200} required />
      <label htmlFor={id("jours_code")}>Code de classe valable (jours, 1 à 365)</label>
      <input
        id={id("jours_code")}
        name="jours_code"
        type="number"
        min={1}
        max={365}
        defaultValue={120}
        required
      />
      <label htmlFor={id("jours_invitation")}>
        Invitation de l&apos;enseignant valable (jours, 1 à 60)
      </label>
      <input
        id={id("jours_invitation")}
        name="jours_invitation"
        type="number"
        min={1}
        max={60}
        defaultValue={14}
        required
      />
      <button type="submit" disabled={enCours}>
        Créer la classe
      </button>
      <Codes etat={etat} />
    </form>
  );
}

/** Nouveau code de classe ou nouvelle invitation d'enseignant pour une classe existante. */
export function ActionsCode({ classe, nom }: { classe: string; nom: string }) {
  const [etatClasse, actionClasse, enCoursClasse] = useActionState(codeClasse, undefined);
  const [etatInvitation, actionInvitation, enCoursInvitation] = useActionState(
    invitationEnseignant,
    undefined,
  );
  return (
    <>
      <form action={actionClasse}>
        <input type="hidden" name="classe" value={classe} />
        <button
          type="submit"
          className="secondaire"
          disabled={enCoursClasse}
          aria-label={`Nouveau code pour la classe ${nom}`}
        >
          Nouveau code de classe
        </button>
        <Codes etat={etatClasse} />
      </form>
      <form action={actionInvitation}>
        <input type="hidden" name="classe" value={classe} />
        <button
          type="submit"
          className="secondaire"
          disabled={enCoursInvitation}
          aria-label={`Nouvelle invitation d'enseignant pour la classe ${nom}`}
        >
          Nouvelle invitation d&apos;enseignant
        </button>
        <Codes etat={etatInvitation} />
      </form>
    </>
  );
}
