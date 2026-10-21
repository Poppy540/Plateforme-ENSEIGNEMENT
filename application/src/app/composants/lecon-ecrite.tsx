import type { LeconEcrite as Lecon } from "@/lib/lecon";

// Leçon écrite (ADR 0051) : texte du script validé, sans image ni script, lisible hors ligne avec la page du
// chapitre. Ouverte d'emblée quand la vidéo n'est pas disponible.
export function LeconEcrite({ lecon, ouverte }: { lecon: Lecon; ouverte: boolean }) {
  return (
    <details className="lecon" open={ouverte}>
      <summary>
        <strong>Leçon écrite</strong>{" "}
        <span className="note">(texte de la vidéo, lisible sans réseau une fois ouvert)</span>
      </summary>
      {lecon.sections.map((s, i) => (
        <section key={i}>
          {s.titre && <h3>{s.titre}</h3>}
          {s.texte.split(/\n+/).map((p, j) => (
            <p key={j}>{p}</p>
          ))}
        </section>
      ))}
      {lecon.consignes.length > 0 && (
        <section>
          <h3>Activité</h3>
          <ul>
            {lecon.consignes.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </section>
      )}
      {lecon.securite.length > 0 && (
        <section>
          <h3>Sécurité</h3>
          <ul>
            {lecon.securite.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </section>
      )}
      {lecon.glossaire.length > 0 && (
        <section>
          <h3>Vocabulaire</h3>
          <dl>
            {lecon.glossaire.map((g, i) => (
              <div key={i}>
                <dt>{g.terme}</dt>
                <dd>{g.definition}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </details>
  );
}
