import "server-only";
import { DatabaseError } from "pg";
import { avecUtilisateur } from "./base";
import { MESSAGE_TROP_D_ESSAIS, essaiDeCodeAutorise } from "./limites-connexion";

// Classes du pilote (ADR 0063). L'élève rejoint sa classe avec le code de classe ; l'enseignant ne reçoit qu'un
// tableau agrégé, calculé et masqué par la base (aucun nombre de 1 à 4 élèves, aucune donnée d'élève).

/** Message d'une erreur prévue par la base (code invalide, autre classe…), ou l'erreur elle-même. */
async function avecErreurMetier(traitement: () => Promise<unknown>): Promise<string | null> {
  try {
    await traitement();
    return null;
  } catch (erreur) {
    if (erreur instanceof DatabaseError && erreur.code === "22023") return erreur.message;
    throw erreur;
  }
}

export async function activerEnseignant(
  utilisateur: string,
  code: string,
  prenom: string,
): Promise<string | null> {
  if (!(await essaiDeCodeAutorise(utilisateur, "code_invitation"))) return MESSAGE_TROP_D_ESSAIS;
  return avecErreurMetier(() =>
    avecUtilisateur(utilisateur, (client) =>
      client.query("select activer_enseignant($1, $2)", [code, prenom]),
    ),
  );
}

export const MESSAGE_CLASSE_COMPLETE =
  "Cette classe est complète. Demande à ton enseignant de vérifier le code de la classe.";

export async function rejoindreClasse(utilisateur: string, code: string): Promise<string | null> {
  if (!(await essaiDeCodeAutorise(utilisateur, "code_classe"))) return MESSAGE_TROP_D_ESSAIS;
  let nom: string | null = null;
  const erreur = await avecErreurMetier(async () => {
    const { rows } = await avecUtilisateur(utilisateur, (client) =>
      client.query("select rejoindre_classe($1) as nom", [code]),
    );
    nom = rows[0].nom;
  });
  if (erreur) return erreur;
  // Classe pleine (D10, ADR 0093) : rien n'est fait ; l'administration est alertée par la base.
  return nom === null ? MESSAGE_CLASSE_COMPLETE : null;
}

export async function quitterClasse(utilisateur: string): Promise<void> {
  await avecUtilisateur(utilisateur, (client) => client.query("select quitter_classe()"));
}

export async function maClasse(
  utilisateur: string,
): Promise<{ nom: string; etablissement: string } | null> {
  return avecUtilisateur(utilisateur, async (client) => {
    const { rows } = await client.query("select nom, etablissement from ma_classe()");
    return rows[0] ?? null;
  });
}

export interface ClasseEnseignant {
  id: string;
  nom: string;
  etablissement: string;
  niveau: string;
  serie: string | null;
}

export async function mesClasses(utilisateur: string): Promise<ClasseEnseignant[]> {
  return avecUtilisateur(utilisateur, async (client) => {
    const { rows } = await client.query(
      "select id, nom, etablissement, niveau, serie from mes_classes()",
    );
    return rows;
  });
}

/** null = petit nombre masqué (1 à 4 élèves). */
type Nombre = number | null;

export interface TableauClasse {
  eleves: Nombre;
  masque: boolean;
  actifs_7_jours?: Nombre;
  chapitres?: {
    matiere: string;
    chapitre: string;
    commence: Nombre;
    termine: Nombre;
    quiz: Nombre;
    score_moyen: Nombre;
  }[];
  notions?: { notion: string; chapitre: string; en_difficulte: number; repondants: number }[];
}

export async function tableauClasse(utilisateur: string, classe: string): Promise<TableauClasse> {
  return avecUtilisateur(utilisateur, async (client) => {
    const { rows } = await client.query("select tableau_classe($1) as t", [classe]);
    return rows[0].t as TableauClasse;
  });
}
