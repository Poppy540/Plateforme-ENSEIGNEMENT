import { seDeconnecter } from "../connexion/actions";
import { formaterUSD } from "@/lib/format";
import { exigerAdministrateur } from "@/lib/serveur/acces-administration";
import { tableauAdministration } from "@/lib/serveur/administration";
import { reactiver } from "./actions";

const formatDate = new Intl.DateTimeFormat("fr", { dateStyle: "short", timeStyle: "short" });
const STATUTS: Record<string, string> = {
  en_attente: "en attente",
  en_cours: "en cours",
  terminee: "terminée",
  echouee: "échouée",
  bloquee: "bloquée (validation)",
  suspendue: "suspendue (agent)",
};

export default async function PageAdministration() {
  const administrateur = await exigerAdministrateur();
  const t = await tableauAdministration(administrateur);

  return (
    <main className="conteneur">
      <h1>Administration</h1>
      <p className="note">
        Suivi de l&apos;Orchestrateur : état des agents, file humaine (la détresse d&apos;abord),
        tâches récentes. Seule l&apos;administration réactive un agent suspendu.
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
              {f.priorite === 1 ? "IMMÉDIAT" : `priorité ${f.priorite}`} · {f.nature} · {f.motif}
            </strong>{" "}
            ({f.source}, {formatDate.format(new Date(f.creeLe))}) — {f.resume}
          </li>
        ))}
      </ol>

      <h2>Tâches récentes</h2>
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
