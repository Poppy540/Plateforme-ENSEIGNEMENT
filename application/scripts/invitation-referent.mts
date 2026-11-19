// Crée une invitation d'enseignant-référent (à lancer par le propriétaire, après sa décision de recrutement).
// Usage : pnpm referent:invitation <référentiel> <famille[,famille…]> [jours]  > invitation.sql
//   - le CODE s'affiche à l'écran (à transmettre au référent par un canal approuvé) ;
//   - le SQL (qui ne contient que l'empreinte du code) part dans invitation.sql, à appliquer avec psql.
import { empreinteCode, genererCodeInvitation, invitationEnSql } from "../src/lib/invitation.ts";

const [referentiel, familles, jours = "14"] = process.argv.slice(2);
if (!referentiel || !familles) {
  console.error("Usage : pnpm referent:invitation <référentiel> <famille[,famille…]> [jours]");
  process.exit(2);
}

const code = genererCodeInvitation();
process.stdout.write(
  invitationEnSql({
    referentiel,
    familles: familles
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean),
    empreinte: empreinteCode(code),
    joursDeValidite: Number(jours),
  }),
);
console.error(`Code d'invitation (à transmettre au référent, valable ${jours} jours) : ${code}`);
