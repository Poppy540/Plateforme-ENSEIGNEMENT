import "server-only";
import { DatabaseError } from "pg";
import { dossierPack, racineDepot } from "@/lib/agents/chargeur-prompt";
import { libellesFamilles } from "@/lib/pack-pays/lecture";
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
    // Libellé lu dans le pack du pays de chaque référentiel (code brut si le pack ne le donne pas).
    const familles = (
      await client.query(
        `select rf.famille, r.pays_code from referents_familles rf
         join referentiels r on r.id = rf.referentiel_id
         where rf.referent_id = $1 order by rf.famille`,
        [utilisateur],
      )
    ).rows.map(
      (r) =>
        libellesFamilles(dossierPack(racineDepot(), r.pays_code))[r.famille as string] ??
        (r.famille as string),
    );
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

// ---------------------------------------------------------------------------------------------------------
// Graphe de prérequis (ADR 0037) : liens proposés par le pack, décidés par un référent de la famille des deux
// chapitres (vérifié par la base). Seuls les liens validés servent aux agents.
// ---------------------------------------------------------------------------------------------------------

export interface LienPrerequis {
  chapitreId: string;
  chapitreTitre: string;
  prerequisId: string;
  prerequisTitre: string;
  prerequisNiveau: string;
  nature: "strict" | "souple";
  statut: "a_valider" | "valide" | "rejete";
  commentaire: string | null;
}

const SELECTION_LIENS = `select p.chapitre_id as "chapitreId", a.titre as "chapitreTitre",
    p.prerequis_id as "prerequisId", b.titre as "prerequisTitre", nb.libelle as "prerequisNiveau",
    p.nature, p.statut, p.commentaire
  from prerequis_chapitres p
  join chapitres a on a.id = p.chapitre_id
  join chapitres b on b.id = p.prerequis_id join unites ub on ub.id = b.unite_id
  join niveaux nb on nb.id = ub.niveau_id
  where est_referent_du_chapitre(p.chapitre_id) and est_referent_du_chapitre(p.prerequis_id)`;

/** Liens dont ce chapitre dépend (ses prérequis), pour sa page. */
export function prerequisDuChapitre(utilisateur: string, id: string): Promise<LienPrerequis[]> {
  return avecUtilisateur(utilisateur, async (client) => {
    if (!/^[0-9a-f-]{36}$/.test(id)) return [];
    const { rows } = await client.query(
      `${SELECTION_LIENS} and p.chapitre_id = $1 order by nb.ordre, b.ordre`,
      [id],
    );
    return rows as LienPrerequis[];
  });
}

/** Liens encore à valider dans les familles du référent (tableau de bord). */
export function liensAValider(utilisateur: string): Promise<LienPrerequis[]> {
  return avecUtilisateur(utilisateur, async (client) => {
    const { rows } = await client.query(
      `${SELECTION_LIENS} and p.statut = 'a_valider' order by a.unite_id, a.ordre, b.ordre limit 100`,
    );
    return rows as LienPrerequis[];
  });
}

export async function deciderLienPrerequis(
  utilisateur: string,
  lien: { chapitreId: string; prerequisId: string },
  decision: "valide" | "rejete",
  commentaire: string | null,
): Promise<string | null> {
  if (![lien.chapitreId, lien.prerequisId].every((x) => /^[0-9a-f-]{36}$/.test(x)))
    return "Lien inconnu.";
  if (decision === "rejete" && !commentaire) return "Expliquez pourquoi ce lien est rejeté.";
  if (commentaire && commentaire.length > 1000) return "Commentaire trop long (1000 caractères).";
  try {
    const ok = await avecUtilisateur(utilisateur, (client) =>
      client
        .query("select decider_prerequis($1, $2, $3, $4) as ok", [
          lien.chapitreId,
          lien.prerequisId,
          decision,
          commentaire,
        ])
        .then((r) => r.rows[0].ok as boolean),
    );
    return ok ? null : "Lien inconnu.";
  } catch (erreur) {
    if (erreur instanceof DatabaseError && erreur.code === "42501")
      return "Ce lien ne relève pas de vos familles de matières.";
    throw erreur;
  }
}
