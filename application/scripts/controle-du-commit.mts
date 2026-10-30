// Contrôle du commit (Jalon 17, étape 2 ; ADR 0096), appelé par `pnpm paquet` : cherche dans .controles/ le dernier
// contrôle complet réussi, sur une copie propre, pour ce commit. Écrit CONTROLE.md dans le paquet (le rapport, ou
// « aucun contrôle complet ») et affiche la ligne à ajouter à VERSION. N'empêche jamais le paquet : il informe.
// Usage : node scripts/controle-du-commit.mts <commit complet | ""> <dossier du paquet>
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { controleDuCommit } from "../src/lib/exploitation/controle.ts";

const [commit, sortie] = process.argv.slice(2);
if (sortie === undefined) {
  console.error('Usage : node scripts/controle-du-commit.mts <commit | ""> <dossier du paquet>');
  process.exit(2);
}
const dossier = join(dirname(fileURLToPath(import.meta.url)), "..", ".controles");
const rapports = existsSync(dossier)
  ? readdirSync(dossier)
      .map((d) => join(dossier, d, "rapport.md"))
      .filter((f) => existsSync(f))
      .map((chemin) => ({ chemin, contenu: readFileSync(chemin, "utf8") }))
  : [];

const trouve = controleDuCommit(rapports, commit || null);
if (trouve) {
  const empreinte = createHash("sha256").update(trouve.contenu).digest("hex");
  writeFileSync(join(sortie, "CONTROLE.md"), trouve.contenu);
  console.log(
    `contrôle complet réussi le ${trouve.entete.date} (rapport CONTROLE.md, sha256 ${empreinte.slice(0, 16)})`,
  );
} else {
  const raison = commit
    ? `Aucun contrôle complet réussi trouvé pour le commit ${commit} sur cette machine.`
    : "Paquet construit avec des modifications non commitées : aucun contrôle ne peut valoir pour lui.";
  writeFileSync(
    join(sortie, "CONTROLE.md"),
    `# Contrôle du paquet\n\n${raison}\n\nAvant un déploiement : \`cd application && pnpm controler\` sur une copie propre, puis \`pnpm paquet\`.\n`,
  );
  console.log("aucun contrôle complet réussi pour ce commit");
}
