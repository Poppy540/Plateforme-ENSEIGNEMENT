import Link from "next/link";
import { exigerAdministrateur } from "@/lib/serveur/acces-administration";
import { chapitresUnitePilote, unitesPourPilote } from "@/lib/serveur/pilote";
import { enregistrer } from "./actions";

// Chapitres du pilote (ADR 0070) : choisis ici par le propriétaire, montrés en tête de l'espace du référent.

export default async function PagePilote({ searchParams }: PageProps<"/administration/pilote">) {
  const administrateur = await exigerAdministrateur();
  const parametres = await searchParams;
  const choisie = typeof parametres.unite === "string" ? parametres.unite : "";
  const unites = await unitesPourPilote(administrateur);
  const unite = unites.find((u) => u.unite === choisie);
  const chapitres = unite ? await chapitresUnitePilote(administrateur, unite.unite) : [];
  const erreur = typeof parametres.erreur === "string" ? parametres.erreur.slice(0, 200) : null;

  return (
    <main className="conteneur">
      <p>
        <Link href="/administration">← Administration</Link>
      </p>
      <h1>Chapitres du pilote</h1>
      <p className="note">
        Choisissez les 3 à 5 chapitres que la classe pilote verra en premier. Ils passent en tête de
        l&apos;espace du référent de leur matière, avec la prochaine action à faire.
      </p>
      <form method="get" className="formulaire">
        <label htmlFor="unite">Unité</label>
        <select id="unite" name="unite" defaultValue={choisie}>
          <option value="">Choisir une unité</option>
          {unites.map((u) => (
            <option key={u.unite} value={u.unite}>
              {u.niveau} — {u.matiere}
              {u.pilote > 0 ? ` (${u.pilote} au pilote)` : ""}
            </option>
          ))}
        </select>
        <button type="submit" className="secondaire">
          Afficher ses chapitres
        </button>
      </form>
      {parametres.enregistre === "1" && <p role="status">Chapitres du pilote enregistrés.</p>}
      {erreur && (
        <p role="alert" className="erreur">
          {erreur}
        </p>
      )}
      {unite && (
        <form action={enregistrer} className="formulaire">
          <input type="hidden" name="unite" value={unite.unite} />
          <fieldset>
            <legend>
              {unite.niveau} — {unite.matiere} : chapitres du pilote
            </legend>
            {chapitres.map((c) => (
              <label key={c.code} className="case">
                <input type="checkbox" name="chapitre" value={c.code} defaultChecked={c.pilote} />{" "}
                {c.titre}
              </label>
            ))}
          </fieldset>
          <button type="submit">Enregistrer</button>
        </form>
      )}
    </main>
  );
}
