// Espace d'entraînement du référent (Jalon 19, étape 2) : `pnpm entrainement:referent`. Crée, sur la base LOCALE
// de développement (données fictives), une invitation de référent pour les Mathématiques, valable 1 jour, et
// affiche son code et la marche à suivre. Refuse toute base qui n'est pas sur cette machine, et la production.
import pg from "pg";
import { estBaseLocale } from "../src/lib/exploitation/entrainement.ts";
import { empreinteCode, genererCodeInvitation, invitationEnSql } from "../src/lib/invitation.ts";

const adresse =
  process.env.URL_BASE_DONNEES_ADMIN ?? "postgresql://postgres@127.0.0.1:54330/postgres";
if (process.env.ENVIRONNEMENT === "production" || !estBaseLocale(adresse)) {
  console.error(
    "Refusé : l'entraînement se fait seulement sur la base locale de développement (données fictives).",
  );
  process.exit(2);
}
const familles = (process.argv[2] ?? "mathematiques").split(",").filter(Boolean);
const code = genererCodeInvitation();
const client = new pg.Client({ connectionString: adresse });
try {
  await client.connect();
  await client.query(
    invitationEnSql({
      referentiel: "ga-general",
      familles,
      empreinte: empreinteCode(code),
      joursDeValidite: 1,
    }),
  );
} catch {
  console.error(
    "Base locale injoignable : lancez d'abord `bash scripts/base-locale.sh demarrer` (voir application/README.md).",
  );
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
console.log(`Espace d'entraînement prêt (familles : ${familles.join(", ")}).

1. Lancez le site local (dans application/) :
   ENVIRONNEMENT=developpement MODE_AUTH=simulation \\
   URL_BASE_DONNEES=postgresql://serveur_application@127.0.0.1:54330/postgres pnpm dev
2. Le référent ouvre http://localhost:3000, se connecte avec un numéro fictif (+999 …) et le code 123456.
3. Il ouvre « Activer votre accès » et saisit son prénom et ce code d'invitation (valable 1 jour) :

   ${code}

Tout est fictif : agents simulés, aucun élève, aucun message envoyé. Pour repartir de zéro :
bash scripts/base-locale.sh reinitialiser, puis relancez cette commande.`);
