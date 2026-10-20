// Vérifie la configuration de production avant une mise en service (ADR 0045). À lancer par le propriétaire
// sur le serveur, avec ses variables d'environnement : `pnpm verifier:production`. N'affiche jamais une valeur.
import { verifierConfiguration } from "../src/lib/production/verification.ts";

const constats = verifierConfiguration(process.env);
for (const c of constats)
  console.log(`${c.ok ? "OK      " : "À FAIRE "} ${c.point}${c.ok ? "" : ` : ${c.message}`}`);
const manques = constats.filter((c) => !c.ok).length;
console.log(
  manques === 0
    ? "Configuration complète."
    : `${manques} point(s) à régler avant la mise en service.`,
);
process.exit(manques === 0 ? 0 : 1);
