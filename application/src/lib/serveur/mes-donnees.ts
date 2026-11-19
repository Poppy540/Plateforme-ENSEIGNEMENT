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
      tentatives_quiz: await requete(
        "select reponses, score, corrige_le from tentatives_quiz where eleve_id = $1 order by corrige_le",
      ),
      contestations_quiz: await requete(
        `select c.question, c.message, c.reexamen, c.cree_le from contestations_quiz c
         join tentatives_quiz t on t.id = c.tentative_id where t.eleve_id = $1 order by c.cree_le`,
      ),
      preferences: await requete(
        "select minutes_par_jour, connexion, rappels_actifs, frequence_rappels, maj_le from preferences_eleves where eleve_id = $1",
      ),
      recommandations_tuteur: await requete(
        "select priorites, message, cree_le from recommandations_tuteur where eleve_id = $1 order by cree_le",
      ),
      rapports_parents: await requete(
        "select periode, contenu, statut, cree_le, envoye_le from rapports_parents where eleve_id = $1 order by cree_le",
      ),
      tickets_support: await requete(
        "select categorie, resume, statut, cree_le, traite_le from tickets_support where demandeur_id = $1 order by cree_le",
      ),
      // Classe du pilote (ADR 0063) : celle de l'élève, ou celles que suit l'enseignant.
      classe: (await client.query("select nom, etablissement from ma_classe()")).rows[0] ?? null,
      classes_suivies: (
        await client.query("select nom, etablissement, niveau, serie from mes_classes()")
      ).rows,
      // Comptes de l'équipe (revue de sécurité D9) : familles, décisions de validation, documents déposés.
      ...(profil && profil.role !== "eleve"
        ? {
            familles_validees: await requete(
              `select r.code as referentiel, rf.famille from referents_familles rf
               join referentiels r on r.id = rf.referentiel_id where rf.referent_id = $1 order by 1, 2`,
            ),
            decisions_de_validation: await requete(
              `select objet_type, version, decision, commentaire, decide_le from approbations
               where valideur_id = $1 order by decide_le`,
            ),
            documents_deposes: await requete(
              `select titre, origine, format, depose_le from documents_officiels
               where depose_par = $1 order by depose_le`,
            ),
            signalements_traites: await requete(
              // Le résumé (rédigé sur un élève) n'est pas une donnée de la personne qui a traité.
              `select motif, priorite, cree_le, traite_le from signalements
               where traite_par = $1 order by traite_le`,
            ),
          }
        : {}),
    };
  });
}
