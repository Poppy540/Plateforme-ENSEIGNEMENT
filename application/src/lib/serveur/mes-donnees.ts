import "server-only";
import { avecUtilisateur } from "./base";

// Droit d'accès (export) et activité du compte. Les règles d'accès de la base garantissent que l'élève
// ne lit que ses propres données.

export function noterActivite(utilisateur: string): Promise<void> {
  return avecUtilisateur(utilisateur, async (client) => {
    await client.query("select noter_activite()");
  });
}

export function exporterDonnees(utilisateur: string) {
  return avecUtilisateur(utilisateur, async (client) => {
    const requete = async (sql: string) => (await client.query(sql, [utilisateur])).rows;
    const [profil] = await requete(
      `select p.prenom_ou_pseudo, p.role, p.cree_le, p.derniere_activite,
         n.libelle as classe, s.libelle as serie, e.etablissement, e.est_mineur, e.statut, r.code as referentiel
       from profils p left join eleves e on e.id = p.id left join niveaux n on n.id = e.niveau_id
       left join series s on s.id = e.serie_id left join referentiels r on r.id = e.referentiel_id
       where p.id = $1`,
    );
    return {
      export: {
        genere_le: new Date().toISOString(),
        note: "Données de votre compte sur la plateforme. Les signalements faits à l'équipe pédagogique ne figurent pas ici : demandez-les à l'équipe.",
      },
      profil: profil ?? null,
      consentements: await requete(
        "select type, contact_parent, demande_le, accorde_le, revoque_le from consentements where eleve_id = $1 order by demande_le",
      ),
      progression: await requete(
        // Jointures externes : un chapitre repassé « à valider » n'est plus lisible par l'élève,
        // mais ses données sur ce chapitre doivent figurer dans l'export.
        `select u.code as unite, coalesce(c.titre, '(chapitre en cours de révision)') as chapitre,
           pr.statut, pr.score, pr.maj_le
         from progression pr left join chapitres c on c.id = pr.chapitre_id left join unites u on u.id = c.unite_id
         where pr.eleve_id = $1 order by pr.maj_le`,
      ),
      echanges_professeur: await requete(
        `select u.code as unite, coalesce(c.titre, '(chapitre en cours de révision)') as chapitre,
           ep.auteur, ep.contenu, ep.cree_le
         from echanges_professeur ep left join chapitres c on c.id = ep.chapitre_id left join unites u on u.id = c.unite_id
         where ep.eleve_id = $1 order by ep.id`,
      ),
    };
  });
}
