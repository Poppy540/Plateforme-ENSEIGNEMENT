import Link from "next/link";
import { redirect } from "next/navigation";
import { seDeconnecter } from "../connexion/actions";
import { FormulaireDeconnexion } from "../composants/hors-ligne";
import { mesClasses, tableauClasse, type TableauClasse } from "@/lib/serveur/classes";
import { roleCompte } from "@/lib/serveur/referent";
import { utilisateurConnecte } from "@/lib/serveur/session";

// Vue de l'enseignant de la classe pilote (ADR 0063) : chiffres agrégés seulement, masqués sous 5 élèves.

function nombre(n: number | null | undefined): string {
  return n === null || n === undefined ? "moins de 5" : String(n);
}

function Tableau({ t, nom }: { t: TableauClasse; nom: string }) {
  if (t.masque)
    return (
      <p role="status">
        Élèves inscrits dans la classe : <strong>{nombre(t.eleves)}</strong>. Les chiffres
        s&apos;affichent dès que 5 élèves au moins ont rejoint la classe avec son code.
      </p>
    );
  return (
    <>
      <p>
        Élèves inscrits dans la classe : <strong>{t.eleves}</strong> ; venus sur la plateforme ces 7
        derniers jours : <strong>{nombre(t.actifs_7_jours)}</strong>.
      </p>
      <h3>Avancement par chapitre (nombre d&apos;élèves)</h3>
      {(t.chapitres ?? []).length === 0 ? (
        <p>Aucun chapitre n&apos;est encore ouvert aux élèves pour cette classe.</p>
      ) : (
        <ul className="liste-cartes" aria-label={`Avancement de la classe ${nom}`}>
          {(t.chapitres ?? []).map((c) => (
            <li key={`${c.matiere}-${c.chapitre}`} className="carte">
              <strong>{c.chapitre}</strong>
              <span className="note">{c.matiere}</span>
              <dl className="chiffres">
                <div>
                  <dt>Commencé</dt>
                  <dd>{nombre(c.commence)}</dd>
                </div>
                <div>
                  <dt>Terminé</dt>
                  <dd>{nombre(c.termine)}</dd>
                </div>
                <div>
                  <dt>Quiz passé</dt>
                  <dd>{nombre(c.quiz)}</dd>
                </div>
                <div>
                  <dt>Score moyen</dt>
                  <dd>{c.score_moyen === null ? "—" : `${c.score_moyen} / 100`}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
      <h3>Notions les plus souvent manquées aux quiz</h3>
      {(t.notions ?? []).length === 0 ? (
        <p>
          Rien à signaler pour l&apos;instant (au moins 5 élèves concernés pour qu&apos;une notion
          apparaisse).
        </p>
      ) : (
        <ul>
          {(t.notions ?? []).map((n) => (
            <li key={n.notion}>
              <strong>{n.notion}</strong> ({n.chapitre}) : {n.en_difficulte} élèves sur{" "}
              {n.repondants} ne l&apos;ont pas encore réussie.
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default async function PageEnseignant() {
  const utilisateur = await utilisateurConnecte();
  if (!utilisateur) redirect("/connexion");
  if ((await roleCompte(utilisateur)) !== "enseignant") redirect("/espace");
  const classes = await mesClasses(utilisateur);
  const tableaux = await Promise.all(classes.map((c) => tableauClasse(utilisateur, c.id)));

  return (
    <main className="conteneur">
      <h1>Suivi de ma classe</h1>
      <p className="note">
        Vous voyez seulement des chiffres d&apos;ensemble de votre classe : aucun nom, aucun
        message, aucune réponse d&apos;élève. Tout nombre inférieur à 5 élèves est masqué.
      </p>
      {classes.length === 0 && <p>Aucune classe ne vous est rattachée.</p>}
      {classes.map((c, i) => (
        <section key={c.id} aria-labelledby={`classe-${c.id}`}>
          <h2 id={`classe-${c.id}`}>
            {c.nom} — {c.etablissement}
          </h2>
          <p>
            Niveau : {c.niveau}
            {c.serie ? `, série ${c.serie}` : ""}
          </p>
          <Tableau t={tableaux[i]} nom={c.nom} />
        </section>
      ))}
      <p>
        <Link href="/enseignant/activer">Ajouter une classe (nouveau code d&apos;invitation)</Link>
      </p>
      <p>
        <Link href="/espace/mes-donnees">Mes données</Link>
      </p>
      <p>
        <Link href="/aide">Aide</Link>
      </p>
      <FormulaireDeconnexion action={seDeconnecter} />
    </main>
  );
}
