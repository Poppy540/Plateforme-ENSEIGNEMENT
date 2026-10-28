import Link from "next/link";
import { seDeconnecter } from "../connexion/actions";
import { FormulaireDeconnexion } from "../composants/hors-ligne";
import { formaterUSD } from "@/lib/format";
import { exigerAdministrateur } from "@/lib/serveur/acces-administration";
import { documentsOfficiels, tableauAdministration } from "@/lib/serveur/administration";
import { CRITERES } from "@/lib/pilote/criteres";
import { LIBELLES_PHASE } from "@/lib/pilote/tableau-de-bord";
import { tableauDeBord } from "@/lib/serveur/tableau-de-bord";
import {
  deconnecterTout,
  fermerAccesEleves,
  reactiver,
  rouvrirAccesEleves,
  supprimerDocument,
  suspendre,
  traiter,
} from "./actions";

const formatDate = new Intl.DateTimeFormat("fr", { dateStyle: "short", timeStyle: "short" });
const STATUTS: Record<string, string> = {
  en_attente: "en attente",
  en_cours: "en cours",
  terminee: "terminée",
  echouee: "échouée",
  bloquee: "bloquée (validation)",
  suspendue: "suspendue (agent)",
};

// Libellés des motifs de signalement, catégories de ticket et sources (le code brut s'affiche à défaut).
const MOTIFS: Record<string, string> = {
  detresse: "détresse",
  hors_programme: "hors programme",
  erreur_contenu: "erreur de contenu",
  demande_reponses: "demande des réponses",
  contenu_inapproprie: "contenu inapproprié",
  paiement_suppression: "paiement ou suppression",
  fraude_plainte: "fraude ou plainte",
  signalement_contenu: "signalement de contenu",
  inscription: "inscription",
  connexion: "connexion",
  choix_classe_serie: "choix de classe ou de série",
  utilisation: "utilisation",
  question_cours: "question de cours",
  autre: "autre",
};
const SOURCES: Record<string, string> = {
  eleve: "élève",
  support: "Support",
  agent_professeur: "Professeur",
  agent_evaluateur: "Évaluateur",
  agent_tuteur: "Tuteur",
  agent_support: "Support",
  agent_production_video: "Production vidéo",
  agent_orchestrateur: "Orchestrateur",
  agent_coordinateur: "Coordinateur",
  agent_conformite: "Conformité",
  agent_recruteur: "Recruteur",
};

/** Critère en cause d'une suspension (facultatif) : sert au critère « deux suspensions pour la même cause ». */
function ChoixCritere({ id }: { id: string }) {
  return (
    <>
      <label htmlFor={id}>Critère en cause (facultatif)</label>
      <select id={id} name="critere" defaultValue="">
        <option value="">Aucun ou autre</option>
        {CRITERES.filter((c) => c.niveau !== "arret").map((c) => (
          <option key={c.code} value={c.code}>
            {c.titre}
          </option>
        ))}
      </select>
    </>
  );
}

/** Les 4 points exigés pour une reprise (docs/pilote/criteres-arret.md). */
function ChampsReprise({ id }: { id: string }) {
  return (
    <>
      <label htmlFor={`cause-${id}`}>Cause identifiée</label>
      <textarea id={`cause-${id}`} name="cause" required minLength={3} maxLength={300} rows={2} />
      <label htmlFor={`correction-${id}`}>Correction faite et testée (quel test ?)</label>
      <textarea
        id={`correction-${id}`}
        name="correction"
        required
        minLength={3}
        maxLength={300}
        rows={2}
      />
      <label className="case">
        <input type="checkbox" name="accord" value="oui" required /> J&apos;ai donné mon accord
        écrit à la reprise
      </label>
      <label className="case">
        <input type="checkbox" name="etablissement" value="oui" required /> L&apos;établissement est
        informé
      </label>
    </>
  );
}

export default async function PageAdministration({ searchParams }: PageProps<"/administration">) {
  const administrateur = await exigerAdministrateur();
  const parametres = await searchParams;
  const erreur = typeof parametres.erreur === "string" ? parametres.erreur.slice(0, 200) : null;
  const ok = typeof parametres.ok === "string" ? parametres.ok.slice(0, 120) : null;
  const [t, documents, pilote] = await Promise.all([
    tableauAdministration(administrateur),
    documentsOfficiels(administrateur),
    tableauDeBord(administrateur),
  ]);

  return (
    <main className="conteneur">
      <h1>Administration</h1>
      <section aria-labelledby="pilote-en-bref" className="encadre">
        <h2 id="pilote-en-bref">Pilote : {LIBELLES_PHASE[pilote.phase]}</h2>
        <p>{pilote.action.texte}</p>
        <p>
          <Link href={pilote.action.lien}>Faire maintenant →</Link> ({pilote.action.libelleLien}) ·{" "}
          <Link href="/administration/tableau-de-bord">Voir le tableau de bord</Link>
        </p>
      </section>
      <p className="note">
        Suivi de l&apos;Orchestrateur : état des agents, file humaine (la détresse d&apos;abord),
        tâches récentes. Seule l&apos;administration réactive un agent suspendu et traite la file
        humaine ; une détresse appelle d&apos;abord une action humaine hors de la plateforme
        (procédure du pilote).
      </p>

      <p>
        <Link href="/administration/tableau-de-bord">Tableau de bord du pilote</Link> ·{" "}
        <Link href="/administration/attentes">Ce qui vous attend</Link> ·{" "}
        <Link href="/administration/exploitation">Pilotage de l&apos;exploitation</Link> ·{" "}
        <Link href="/administration/recrutement">Recrutement des enseignants-référents</Link> ·{" "}
        <Link href="/administration/invitations">Inviter un référent</Link> ·{" "}
        <Link href="/administration/classes">Classes du pilote</Link> ·{" "}
        <Link href="/administration/pilote">Chapitres du pilote</Link> ·{" "}
        <Link href="/administration/conditions">Conditions du pilote</Link> ·{" "}
        <Link href="/administration/criteres">Critères de suspension</Link> ·{" "}
        <Link href="/administration/journal">Journal du pilote</Link> ·{" "}
        <Link href="/administration/semaine">Semaine du pilote</Link> ·{" "}
        <Link href="/administration/fin-pilote">Rapport de fin de pilote</Link> ·{" "}
        <Link href="/administration/cloture">Clôture du pilote</Link> ·{" "}
        <Link href="/administration/donnees">Sort des données</Link> ·{" "}
        <Link href="/espace/mes-donnees">Mes données</Link>
      </p>

      {ok && <p role="status">{ok}</p>}
      {erreur && (
        <p role="alert" className="erreur">
          {erreur}
        </p>
      )}
      <h2 id="acces">Accès des élèves</h2>
      <p role="status">
        {t.accesEleves.ouvert ? (
          <>
            Accès des élèves : <strong>ouvert</strong>
          </>
        ) : (
          <>
            Accès des élèves : <strong>fermé</strong> depuis le{" "}
            {formatDate.format(new Date(t.accesEleves.majLe))}
            {t.accesEleves.motif && <> — {t.accesEleves.motif}</>}
          </>
        )}
      </p>
      {t.accesEleves.ouvert ? (
        <form action={fermerAccesEleves} className="formulaire">
          <label htmlFor="motif">Motif (interne, jamais montré aux élèves)</label>
          <input id="motif" name="motif" required minLength={3} maxLength={500} />
          <ChoixCritere id="critere-acces" />
          <div className="actions">
            <button type="submit">Fermer l&apos;accès des élèves</button>
          </div>
        </form>
      ) : (
        <details>
          <summary>Rouvrir l&apos;accès des élèves (reprise)</summary>
          <form action={rouvrirAccesEleves} className="formulaire">
            <ChampsReprise id="acces" />
            <div className="actions">
              <button type="submit">Rouvrir l&apos;accès des élèves</button>
            </div>
          </form>
        </details>
      )}
      <p className="note">
        Fermé : espace élève, cours, quiz, plan, assistant d&apos;aide et inscriptions affichent un
        message neutre ; « Mes données » reste accessible. Un agent suspendu ne répond plus à
        personne.
      </p>

      <h2 id="agents">Agents</h2>
      <ul>
        {t.agents.map((a) => (
          <li key={a.agent}>
            {a.agent} : <strong>{a.suspendu ? "suspendu" : "actif"}</strong>
            {a.motif && <> — {a.motif}</>}
            {a.suspendu ? (
              <details>
                <summary>Réactiver {a.agent} (reprise)</summary>
                <form action={reactiver} className="formulaire">
                  <input type="hidden" name="agent" value={a.agent} />
                  <ChampsReprise id={a.agent} />
                  <button type="submit" className="secondaire">
                    Réactiver {a.agent}
                  </button>
                </form>
              </details>
            ) : (
              <details>
                <summary>Suspendre {a.agent}</summary>
                <form action={suspendre} className="formulaire">
                  <input type="hidden" name="agent" value={a.agent} />
                  <label htmlFor={`motif-${a.agent}`}>Motif de la suspension</label>
                  <input
                    id={`motif-${a.agent}`}
                    name="motif"
                    required
                    minLength={3}
                    maxLength={500}
                  />
                  <ChoixCritere id={`critere-${a.agent}`} />
                  <button type="submit">Suspendre {a.agent}</button>
                </form>
              </details>
            )}
          </li>
        ))}
      </ul>

      <h2>File humaine ({t.fileHumaine.length})</h2>
      {t.fileHumaine.length === 0 && <p>Rien en attente.</p>}
      <ol>
        {t.fileHumaine.map((f) => (
          <li key={f.id}>
            <strong>
              {f.priorite === 1 ? "IMMÉDIAT" : `priorité ${f.priorite}`} · {f.nature} ·{" "}
              {MOTIFS[f.motif] ?? f.motif}
            </strong>{" "}
            ({SOURCES[f.source] ?? f.source}, {formatDate.format(new Date(f.creeLe))}
            {f.statut === "en_cours" && ", pris en charge"}) — {f.resume}
            <form action={traiter} className="actions">
              <input type="hidden" name="nature" value={f.nature} />
              <input type="hidden" name="id" value={f.id} />
              {f.nature === "signalement" ? (
                <button type="submit" name="decision" value="traite" className="secondaire">
                  Marquer comme traité
                </button>
              ) : (
                <>
                  {f.statut === "ouvert" && (
                    <button type="submit" name="decision" value="en_cours" className="secondaire">
                      Prendre en charge
                    </button>
                  )}
                  <button type="submit" name="decision" value="resolu" className="secondaire">
                    Marquer comme résolu
                  </button>
                </>
              )}
            </form>
          </li>
        ))}
      </ol>

      <h2>Tâches récentes</h2>
      {t.taches.length === 0 && <p>Aucune tâche récente.</p>}
      <ul>
        {t.taches.map((x) => (
          <li key={x.id}>
            {formatDate.format(new Date(x.creeLe))} · {x.type} → {x.agent} :{" "}
            <strong>{STATUTS[x.statut] ?? x.statut}</strong> · priorité {x.priorite} · tentatives{" "}
            {x.tentatives} · {formaterUSD(x.coutUSD)}
            {x.motif && <> — {x.motif}</>}
          </li>
        ))}
      </ul>

      <h2>Documents officiels ({documents.length})</h2>
      <p className="note">
        Déposés par les référents pour l&apos;agent Conformité. La suppression est définitive et
        emporte les rapports d&apos;écart du document ; elle est inscrite au journal d&apos;audit.
      </p>
      {documents.length === 0 && <p>Aucun document déposé.</p>}
      <ul>
        {documents.map((d) => (
          <li key={d.id}>
            <strong>{d.titre}</strong> ({d.referentiel}, {d.format === "pdf" ? "PDF" : "texte"},{" "}
            {formatDate.format(new Date(d.deposeLe))}, {d.rapports} rapport(s)) — {d.origine}
            <form action={supprimerDocument} className="actions">
              <input type="hidden" name="document" value={d.id} />
              <label>
                <input type="checkbox" name="confirmation" value="oui" required /> Je confirme
              </label>{" "}
              <button type="submit" className="secondaire">
                Supprimer « {d.titre} »
              </button>
            </form>
          </li>
        ))}
      </ul>

      <h2>Sessions</h2>
      <p className="note">
        En cas d&apos;incident (dossier de production, §8) : toutes les personnes connectées sont
        déconnectées, sauf vous. Elles devront redemander un code.
      </p>
      <form action={deconnecterTout} className="actions">
        <label>
          <input type="checkbox" name="confirmation" value="oui" required /> Je confirme
        </label>{" "}
        <button type="submit" className="secondaire">
          Déconnecter toutes les sessions
        </button>
      </form>

      <FormulaireDeconnexion action={seDeconnecter} />
    </main>
  );
}
