import "server-only";
import { DatabaseError } from "pg";
import { avecUtilisateur } from "./base";

// Espace enseignant-référent : les règles d'accès ne lui montrent que les chapitres de ses familles de matières.

export async function roleCompte(
  utilisateur: string,
): Promise<"eleve" | "parent" | "referent" | "administrateur" | null> {
  return avecUtilisateur(utilisateur, async (client) => {
    const { rows } = await client.query("select role from profils where id = $1", [utilisateur]);
    return rows[0]?.role ?? null;
  });
}

export interface ChapitreAValider {
  id: string;
  titre: string;
  ordre: number;
  version: number;
  unite: string;
  matiere: string;
  niveau: string;
  series: string[];
}

export interface TableauReferent {
  prenom: string;
  familles: string[];
  aValider: ChapitreAValider[];
  decisionsRecentes: {
    titre: string;
    unite: string;
    decision: "valide" | "rejete";
    decideLe: string;
  }[];
}

export function tableauReferent(utilisateur: string): Promise<TableauReferent> {
  return avecUtilisateur(utilisateur, async (client) => {
    const prenom = (
      await client.query("select prenom_ou_pseudo from profils where id = $1", [utilisateur])
    ).rows[0]?.prenom_ou_pseudo;
    const familles = (
      await client.query(
        "select famille from referents_familles where referent_id = $1 order by famille",
        [utilisateur],
      )
    ).rows.map((r) => r.famille as string);
    const aValider = (
      await client.query(
        `select c.id, c.titre, c.ordre, c.version, u.code as unite, coalesce(u.libelle_local, m.libelle) as matiere,
           n.libelle as niveau,
           coalesce((select array_agg(s.code order by s.code) from unites_series us join series s on s.id = us.serie_id
                     where us.unite_id = u.id), '{}') as series
         from chapitres c
         join unites u on u.id = c.unite_id join matieres m on m.id = u.matiere_id join niveaux n on n.id = u.niveau_id
         where c.statut = 'a_valider' and est_referent_du_chapitre(c.id)
         order by n.ordre, matiere, u.code, c.ordre`,
      )
    ).rows as ChapitreAValider[];
    const decisionsRecentes = (
      await client.query(
        `select c.titre, u.code as unite, a.decision, a.decide_le as "decideLe"
         from approbations a join chapitres c on c.id = a.objet_id join unites u on u.id = c.unite_id
         where a.objet_type = 'chapitre' and a.valideur_id = $1
         order by a.decide_le desc limit 10`,
        [utilisateur],
      )
    ).rows;
    return { prenom, familles, aValider, decisionsRecentes };
  });
}

export interface ChapitreDetaille {
  id: string;
  titre: string;
  sousThemes: string[];
  ordre: number;
  version: number;
  statut: "a_valider" | "valide" | "rejete";
  empreinte: string;
  unite: string;
  matiere: string;
  niveau: string;
  volumeHoraire: number | null;
  coefficient: number | null;
  historique: {
    version: number;
    decision: "valide" | "rejete";
    commentaire: string | null;
    valideur: string | null;
    decideLe: string;
  }[];
}

/** Chapitre de la famille du référent (null s'il n'y a pas accès). */
export function chapitrePourReferent(
  utilisateur: string,
  id: string,
): Promise<ChapitreDetaille | null> {
  return avecUtilisateur(utilisateur, async (client) => {
    if (!/^[0-9a-f-]{36}$/.test(id)) return null;
    const { rows } = await client.query(
      `select c.id, c.titre, c.sous_themes as "sousThemes", c.ordre, c.version, c.statut, c.empreinte,
         u.code as unite, coalesce(u.libelle_local, m.libelle) as matiere, n.libelle as niveau,
         c.volume_horaire::float as "volumeHoraire", c.coefficient::float as coefficient
       from chapitres c
       join unites u on u.id = c.unite_id join matieres m on m.id = u.matiere_id join niveaux n on n.id = u.niveau_id
       where c.id = $1 and est_referent_du_chapitre(c.id)`,
      [id],
    );
    if (!rows[0]) return null;
    const historique = (
      await client.query(
        `select a.version, a.decision, a.commentaire, p.prenom_ou_pseudo as valideur, a.decide_le as "decideLe"
         from approbations a left join profils p on p.id = a.valideur_id
         where a.objet_type = 'chapitre' and a.objet_id = $1 order by a.decide_le desc`,
        [id],
      )
    ).rows;
    return { ...rows[0], historique } as ChapitreDetaille;
  });
}

export type ResultatDecision = { ok: true } | { ok: false; erreur: string };

export async function deciderChapitre(
  utilisateur: string,
  decision: {
    id: string;
    decision: "valide" | "rejete";
    version: number;
    commentaire: string | null;
  },
): Promise<ResultatDecision> {
  try {
    await avecUtilisateur(utilisateur, (client) =>
      client.query("select valider_chapitre($1, $2, $3, $4)", [
        decision.id,
        decision.decision,
        decision.version,
        decision.commentaire,
      ]),
    );
    return { ok: true };
  } catch (erreur) {
    if (erreur instanceof DatabaseError) {
      if (erreur.code === "40001") {
        return {
          ok: false,
          erreur: "Le chapitre a été modifié depuis votre lecture. Relisez la nouvelle version.",
        };
      }
      if (erreur.code === "42501")
        return { ok: false, erreur: "Vous ne pouvez pas valider ce chapitre." };
      if (erreur.code === "22023") return { ok: false, erreur: erreur.message };
    }
    throw erreur;
  }
}

export async function activerReferent(
  utilisateur: string,
  code: string,
  prenom: string,
): Promise<string | null> {
  try {
    await avecUtilisateur(utilisateur, (client) =>
      client.query("select activer_referent($1, $2)", [code, prenom]),
    );
    return null;
  } catch (erreur) {
    if (erreur instanceof DatabaseError && erreur.code === "22023") return erreur.message;
    throw erreur;
  }
}
