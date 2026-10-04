"use client";

import { useActionState, useState } from "react";
import type { OptionsInscription } from "@/lib/serveur/requetes";
import { sInscrire } from "./actions";

export function FormulaireInscription({ options }: { options: OptionsInscription }) {
  const [etat, action, enCours] = useActionState(sInscrire, undefined);
  const [codeReferentiel, setCodeReferentiel] = useState(options.referentiels[0]?.code ?? "");
  const [codeNiveau, setCodeNiveau] = useState("");
  const [majeur, setMajeur] = useState(false);

  const referentiel = options.referentiels.find((r) => r.code === codeReferentiel);
  const niveau = referentiel?.niveaux.find((n) => n.code === codeNiveau);
  const ageMajorite = referentiel?.ageMajorite ?? null;
  const parentRequis = ageMajorite === null || !majeur;

  return (
    <form action={action} className="formulaire">
      <label htmlFor="prenom">Ton prénom ou un pseudonyme</label>
      <input
        id="prenom"
        name="prenom"
        maxLength={40}
        autoComplete="given-name"
        defaultValue={etat?.valeurs?.prenom}
        required
      />

      {options.referentiels.length > 1 ? (
        <>
          <label htmlFor="referentiel">Pays et programme</label>
          <select
            id="referentiel"
            name="referentiel"
            value={codeReferentiel}
            onChange={(e) => {
              setCodeReferentiel(e.target.value);
              setCodeNiveau("");
            }}
          >
            {options.referentiels.map((r) => (
              <option key={r.code} value={r.code}>
                {r.pays} ({r.code})
              </option>
            ))}
          </select>
        </>
      ) : (
        <input type="hidden" name="referentiel" value={codeReferentiel} />
      )}

      <label htmlFor="niveau">Ta classe</label>
      <select
        id="niveau"
        name="niveau"
        value={codeNiveau}
        onChange={(e) => setCodeNiveau(e.target.value)}
        required
      >
        <option value="">Choisir…</option>
        {referentiel?.niveaux.map((n) => (
          <option key={n.code} value={n.code}>
            {n.libelle}
          </option>
        ))}
      </select>

      {niveau?.seriesObligatoires && (
        <>
          <label htmlFor="serie">Ta série</label>
          <select id="serie" name="serie" required defaultValue="">
            <option value="">Choisir…</option>
            {referentiel?.series.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code} — {s.libelle}
              </option>
            ))}
          </select>
        </>
      )}

      {ageMajorite !== null && (
        <label className="case">
          <input
            type="checkbox"
            name="majeur"
            value="oui"
            checked={majeur}
            onChange={(e) => setMajeur(e.target.checked)}
          />
          J&apos;ai {ageMajorite} ans ou plus
        </label>
      )}

      {parentRequis && (
        <>
          <label htmlFor="contact_parent">Numéro ou email d&apos;un parent ou tuteur</label>
          <input
            id="contact_parent"
            name="contact_parent"
            inputMode="tel"
            placeholder="+ indicatif du pays, puis le numéro"
            required
          />
          <p className="note">
            Il recevra un lien pour accepter ton inscription. Ton compte s&apos;ouvre dès qu&apos;il
            a accepté.
          </p>
        </>
      )}

      <label htmlFor="etablissement">Ton établissement (facultatif)</label>
      <input
        id="etablissement"
        name="etablissement"
        maxLength={120}
        defaultValue={etat?.valeurs?.etablissement}
      />

      {etat?.erreur && (
        <p role="alert" className="erreur">
          {etat.erreur}
        </p>
      )}
      <button type="submit" disabled={enCours}>
        {enCours ? "Inscription…" : "M'inscrire"}
      </button>
    </form>
  );
}
