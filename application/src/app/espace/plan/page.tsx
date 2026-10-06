import Link from "next/link";
import { exigerEleveActif } from "@/lib/serveur/acces-eleve";
import { planDeLEleve } from "@/lib/serveur/tuteur";
import { FormulairePlan, FormulairePreferences } from "./formulaires";

const formatDate = new Intl.DateTimeFormat("fr", { dateStyle: "medium", timeStyle: "short" });

export default async function PagePlan() {
  const eleve = await exigerEleveActif();
  const { preferences, dernier } = await planDeLEleve(eleve);

  return (
    <main className="conteneur">
      <p>
        <Link href="/espace">← Mon espace</Link>
      </p>
      <h1>Mon plan de révision</h1>
      <p className="note">
        Ton tuteur est une intelligence artificielle. Il regarde tes résultats et les chapitres à
        maîtriser avant, puis te propose au plus trois priorités. Il ne te compare à personne.
      </p>

      {dernier ? (
        <section>
          <h2>Ton plan ({formatDate.format(new Date(dernier.creeLe))})</h2>
          {dernier.priorites.length > 0 && (
            <ol>
              {dernier.priorites.map((p) => (
                <li key={p.chapitreId}>
                  {p.chapitreCode ? (
                    <Link href={`/catalogue/${p.unite}/${p.chapitreCode}`}>{p.titre}</Link>
                  ) : (
                    p.titre
                  )}{" "}
                  — {p.minutes} min. <span className="note">{p.raison}</span>
                </li>
              ))}
            </ol>
          )}
          {dernier.message.split("\n\n").map((paragraphe, i) => (
            <p key={i}>{paragraphe}</p>
          ))}
        </section>
      ) : (
        <p>Pas encore de plan : mets-le à jour ci-dessous.</p>
      )}

      <FormulairePlan />

      <h2>Mes préférences</h2>
      <FormulairePreferences
        minutes={preferences.minutesParJour}
        connexion={preferences.connexion}
        rappels={preferences.rappelsActifs}
        frequence={preferences.frequenceRappels}
      />
    </main>
  );
}
