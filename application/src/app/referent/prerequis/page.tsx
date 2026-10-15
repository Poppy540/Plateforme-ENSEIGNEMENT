import Link from "next/link";
import { exigerReferent } from "@/lib/serveur/acces-referent";
import { liensAValider } from "@/lib/serveur/referent";

// Liens de prérequis proposés, encore à valider dans les familles du référent (ADR 0037), groupés par chapitre.
export default async function PagePrerequis() {
  const utilisateur = await exigerReferent();
  const liens = await liensAValider(utilisateur);
  const parChapitre = new Map<string, { titre: string; prerequis: typeof liens }>();
  for (const l of liens) {
    const groupe = parChapitre.get(l.chapitreId) ?? { titre: l.chapitreTitre, prerequis: [] };
    groupe.prerequis.push(l);
    parChapitre.set(l.chapitreId, groupe);
  }

  return (
    <main className="conteneur">
      <p>
        <Link href="/referent">← Espace référent</Link>
      </p>
      <h1>Liens de prérequis à valider</h1>
      <p className="note">
        Proposés par le pack, à vérifier chapitre par chapitre. Ouvrez un chapitre pour valider ou
        rejeter ses liens.
      </p>
      {liens.length === 0 && <p>Aucun lien en attente.</p>}
      <ul>
        {[...parChapitre].map(([id, groupe]) => (
          <li key={id}>
            <Link href={`/referent/chapitres/${id}`}>{groupe.titre}</Link> :{" "}
            {groupe.prerequis.map((p) => `${p.prerequisTitre} (${p.prerequisNiveau})`).join(" ; ")}
          </li>
        ))}
      </ul>
    </main>
  );
}
