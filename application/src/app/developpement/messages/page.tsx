import { notFound } from "next/navigation";
import { connection } from "next/server";
import { simulationAutorisee } from "@/lib/serveur/configuration";
import { messagesSimules } from "@/lib/serveur/messagerie";

// Boîte de réception simulée : n'existe qu'en développement et en test (aucun vrai SMS ni email).
export default async function PageMessagesSimules() {
  await connection(); // contenu propre à chaque requête : jamais précalculé
  if (!simulationAutorisee()) notFound();
  const messages = messagesSimules();
  return (
    <main className="conteneur">
      <h1>Messages simulés</h1>
      <p className="note">
        Développement uniquement : ces messages auraient été envoyés par SMS ou email.
      </p>
      {messages.length === 0 && <p>Aucun message.</p>}
      <ul className="messages">
        {messages.map((m) => (
          <li key={m.envoyeLe + m.destinataire}>
            <strong>À {m.destinataire}</strong> — {m.envoyeLe}
            <p>{m.texte}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
