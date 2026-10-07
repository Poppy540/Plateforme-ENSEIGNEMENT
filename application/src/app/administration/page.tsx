import { seDeconnecter } from "../connexion/actions";
import { formaterUSD } from "@/lib/format";
import { exigerAdministrateur } from "@/lib/serveur/acces-administration";
import { tableauAdministration } from "@/lib/serveur/administration";
import { reactiver, traiter } from "./actions";

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
};

export default async function PageAdministration() {
  const administrateur = await exigerAdministrateur();
  const t = await tableauAdministration(administrateur);

  return (
    <main className="conteneur">
      <h1>Administration</h1>
      <p className="note">
        Suivi de l&apos;Orchestrateur : état des agents, file humaine (la détresse d&apos;abord),
        tâches récentes. Seule l&apos;administration réactive un agent suspendu et traite la file
        humaine ; une détresse appelle d&apos;abord une action humaine hors de la plateforme
        (procédure du pilote).
      </p>

      <h2>Agents</h2>
      <ul>
        {t.agents.map((a) => (
          <li key={a.agent}>
            {a.agent} : <strong>{a.suspendu ? "suspendu" : "actif"}</strong>
            {a.motif && <> — {a.motif}</>}
            {a.suspendu && (
              <form action={reactiver} style={{ display: "inline" }}>
                <input type="hidden" name="agent" value={a.agent} />{" "}
                <button type="submit" className="secondaire">
                  Réactiver {a.agent}
                </button>
              </form>
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

      <form action={seDeconnecter}>
        <button type="submit" className="secondaire">
          Se déconnecter
        </button>
      </form>
    </main>
  );
}
