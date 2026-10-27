// Crée une classe du pilote et l'invitation de son enseignant (à lancer par le propriétaire ; ADR 0063).
// Usage : pnpm classe:creer <référentiel> <niveau> "<nom de la classe>" "<établissement>" [--serie C]
//                           [--jours-code 120] [--jours-invitation 14]  > classe.sql
//   - les DEUX codes s'affichent à l'écran : le code de classe (que l'enseignant donne à ses élèves) et le code
//     d'invitation (personnel, pour l'enseignant), à transmettre par un canal approuvé ;
//   - le SQL (qui ne contient que leurs empreintes) part dans classe.sql, à appliquer avec psql. Il ne crée rien
//     si le référentiel ou le niveau n'existe pas (vérifier la ligne « classe_id » rendue).
import { classeEnSql, empreinteCode, genererCodeInvitation } from "../src/lib/invitation.ts";

const args = process.argv.slice(2);
const option = (nom: string) => {
  const i = args.indexOf(nom);
  if (i < 0) return undefined;
  const valeur = args[i + 1];
  args.splice(i, 2);
  return valeur;
};
const serie = option("--serie") ?? null;
const joursCode = Number(option("--jours-code") ?? "120");
const joursInvitation = Number(option("--jours-invitation") ?? "14");
const [referentiel, niveau, nom, etablissement] = args;
if (!referentiel || !niveau || !nom || !etablissement) {
  console.error(
    'Usage : pnpm classe:creer <référentiel> <niveau> "<nom de la classe>" "<établissement>" [--serie C] [--jours-code 120] [--jours-invitation 14]',
  );
  process.exit(2);
}

const codeClasse = genererCodeInvitation();
const codeEnseignant = genererCodeInvitation();
process.stdout.write(
  classeEnSql({
    referentiel,
    niveau,
    serie,
    nom,
    etablissement,
    empreinteClasse: empreinteCode(codeClasse),
    empreinteEnseignant: empreinteCode(codeEnseignant),
    joursCodeClasse: joursCode,
    joursInvitation,
  }),
);
console.error(`Code de la classe (pour les élèves, valable ${joursCode} jours) : ${codeClasse}`);
console.error(
  `Code d'invitation de l'enseignant (personnel, valable ${joursInvitation} jours) : ${codeEnseignant}`,
);
