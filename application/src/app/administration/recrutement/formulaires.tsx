"use client";

import { useActionState } from "react";
import { ajouterCandidat, demanderTache, envoyer, type EtatRecrutement } from "./actions";

function Etat({ etat }: { etat: EtatRecrutement }) {
  if (!etat) return null;
  return (
    <>
      {etat.erreur && <p className="erreur">{etat.erreur}</p>}
      {etat.refus && <p className="erreur">Refus de l&apos;agent : {etat.refus}</p>}
      {etat.succes && <p role="status">{etat.succes}</p>}
      {etat.details && etat.details.length > 0 && (
        <ul>
          {etat.details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}
    </>
  );
}

export function FormulaireCandidat({
  referentiel,
  familles,
  sources,
}: {
  referentiel: string;
  familles: { code: string; libelle: string }[];
  sources: { id: string; libelle: string }[];
}) {
  const [etat, action, enCours] = useActionState(ajouterCandidat, undefined);
  return (
    <form action={action} className="formulaire">
      <input type="hidden" name="referentiel" value={referentiel} />
      <label htmlFor="nom">Nom (fictif tant que le juriste n&apos;a pas rendu son avis)</label>
      <input id="nom" name="nom" required maxLength={120} />
      <label htmlFor="famille">Famille de matières</label>
      <select id="famille" name="famille" required>
        {familles.map((f) => (
          <option key={f.code} value={f.code}>
            {f.libelle}
          </option>
        ))}
      </select>
      <label htmlFor="niveau">Niveau enseigné (facultatif)</label>
      <input id="niveau" name="niveau" maxLength={60} />
      <label htmlFor="structure">Établissement ou structure (facultatif)</label>
      <input id="structure" name="structure" maxLength={200} />
      <label htmlFor="contact">Email professionnel</label>
      <input id="contact" name="contact" type="email" required maxLength={200} />
      <label htmlFor="source">Source autorisée</label>
      <select id="source" name="source" required>
        {sources.map((s) => (
          <option key={s.id} value={s.id}>
            {s.libelle}
          </option>
        ))}
      </select>
      <label htmlFor="source_detail">Précision sur la source (facultatif)</label>
      <input id="source_detail" name="source_detail" maxLength={300} />
      <Etat etat={etat} />
      <div className="actions">
        <button type="submit" disabled={enCours}>
          {enCours ? "Création…" : "Créer la fiche"}
        </button>
      </div>
    </form>
  );
}

const TACHES = [
  { valeur: "qualifier", libelle: "Qualifier la fiche (informations du candidat)" },
  { valeur: "premier_contact", libelle: "Rédiger le premier message" },
  { valeur: "relance", libelle: "Rédiger l'unique relance" },
  { valeur: "repondre", libelle: "Préparer une réponse (réponse reçue du candidat)" },
  { valeur: "accord", libelle: "Préparer le dossier d'accord" },
  { valeur: "consigne", libelle: "Autre consigne" },
];

export function FormulaireTache({ candidat }: { candidat: string }) {
  const [etat, action, enCours] = useActionState(demanderTache, undefined);
  return (
    <form action={action} className="formulaire">
      <input type="hidden" name="candidat" value={candidat} />
      <label htmlFor="tache">Tâche</label>
      <select id="tache" name="tache" required>
        {TACHES.map((t) => (
          <option key={t.valeur} value={t.valeur}>
            {t.libelle}
          </option>
        ))}
      </select>
      <label htmlFor="informations">
        Informations ou réponse du candidat (lues par l&apos;agent, jamais conservées)
      </label>
      <textarea id="informations" name="informations" rows={4} maxLength={8000} />
      <label htmlFor="consigne">Consigne pour l&apos;agent (facultatif)</label>
      <input id="consigne" name="consigne" maxLength={2000} />
      <Etat etat={etat} />
      <div className="actions">
        <button type="submit" disabled={enCours}>
          {enCours ? "L'agent prépare…" : "Demander à l'agent"}
        </button>
      </div>
    </form>
  );
}

export function FormulaireEnvoi({
  candidat,
  referentiel,
  message,
  objet,
}: {
  candidat: string;
  referentiel: string;
  message: string;
  objet: string;
}) {
  const [etat, action, enCours] = useActionState(envoyer, undefined);
  return (
    <form action={action}>
      <input type="hidden" name="candidat" value={candidat} />
      <input type="hidden" name="referentiel" value={referentiel} />
      <input type="hidden" name="message" value={message} />
      <Etat etat={etat} />
      <button type="submit" disabled={enCours} aria-label={`Envoyer « ${objet} »`}>
        {enCours ? "Envoi…" : "Envoyer"}
      </button>
    </form>
  );
}
