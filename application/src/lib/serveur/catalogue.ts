import "server-only";
import type { PoolClient } from "pg";
import { avecUtilisateur } from "./base";

// Catalogue de l'élève connecté. Les règles d'accès de la base ne lui montrent que les chapitres validés ;
// classes, séries et matières viennent du référentiel de l'élève (jamais du code).

export interface ContexteEleve {
  referentielId: string;
  niveauCode: string;
  serieCode: string | null;
  statut: "en_attente_parent" | "actif" | "suspendu";
}

export interface NiveauCatalogue {
  code: string;
  libelle: string;
  seriesObligatoires: boolean;
}

export interface UniteCatalogue {
  code: string;
  matiere: string;
  series: string[];
  chapitresDisponibles: number;
  chapitresTermines: number;
}

export interface ChapitreCatalogue {
  code: string;
  ordre: number;
  titre: string;
  sousThemes: string[];
  statut: "a_voir" | "en_cours" | "termine";
}

async function contexte(client: PoolClient, utilisateur: string): Promise<ContexteEleve | null> {
  const { rows } = await client.query(
    `select e.referentiel_id, n.code as niveau_code, s.code as serie_code, e.statut
     from eleves e join niveaux n on n.id = e.niveau_id left join series s on s.id = e.serie_id
     where e.id = $1`,
    [utilisateur],
  );
  const r = rows[0];
  return r
    ? {
        referentielId: r.referentiel_id,
        niveauCode: r.niveau_code,
        serieCode: r.serie_code,
        statut: r.statut,
      }
    : null;
}

export function contexteEleve(utilisateur: string) {
  return avecUtilisateur(utilisateur, (client) => contexte(client, utilisateur));
}

export interface PageCatalogue {
  niveaux: NiveauCatalogue[];
  series: { code: string; libelle: string }[];
  niveau: NiveauCatalogue;
  serie: string | null;
  estSaClasse: boolean;
  unites: UniteCatalogue[];
}

/**
 * Unités d'une classe (par défaut celle de l'élève). Pour une classe à séries, seules les unités de la série
 * choisie (par défaut celle de l'élève) sont listées ; une unité sans série couvre toute la classe.
 */
export function catalogue(
  utilisateur: string,
  choix: { niveau?: string; serie?: string },
): Promise<PageCatalogue | null> {
  return avecUtilisateur(utilisateur, async (client) => {
    const eleve = await contexte(client, utilisateur);
    if (!eleve) return null;

    const niveaux = (
      await client.query(
        `select code, libelle, series_obligatoires as "seriesObligatoires"
         from niveaux where referentiel_id = $1 order by ordre`,
        [eleve.referentielId],
      )
    ).rows as NiveauCatalogue[];
    const series = (
      await client.query(
        "select code, libelle from series where referentiel_id = $1 order by code",
        [eleve.referentielId],
      )
    ).rows as { code: string; libelle: string }[];

    const niveau = niveaux.find((n) => n.code === (choix.niveau ?? eleve.niveauCode));
    if (!niveau) return null;
    const serieDemandee =
      choix.serie ?? (niveau.code === eleve.niveauCode ? eleve.serieCode : null);
    const serie =
      niveau.seriesObligatoires && series.some((s) => s.code === serieDemandee)
        ? serieDemandee
        : null;

    const { rows } = await client.query(
      `select u.code,
         coalesce(u.libelle_local, m.libelle) as matiere,
         coalesce(array_agg(distinct s.code) filter (where s.code is not null), '{}') as series,
         (select count(*)::int from chapitres c where c.unite_id = u.id) as "chapitresDisponibles",
         (select count(*)::int from chapitres c join progression p on p.chapitre_id = c.id
            where c.unite_id = u.id and p.eleve_id = $4 and p.statut = 'termine') as "chapitresTermines"
       from unites u
       join niveaux n on n.id = u.niveau_id
       join matieres m on m.id = u.matiere_id
       left join unites_series us on us.unite_id = u.id
       left join series s on s.id = us.serie_id
       where u.referentiel_id = $1 and n.code = $2
       group by u.id, m.libelle
       having $3::text is null
           or count(s.code) = 0
           or bool_or(s.code = $3::text)
       order by matiere`,
      [eleve.referentielId, niveau.code, serie, utilisateur],
    );

    return {
      niveaux,
      series,
      niveau,
      serie,
      estSaClasse: niveau.code === eleve.niveauCode && serie === eleve.serieCode,
      unites: rows as UniteCatalogue[],
    };
  });
}

export interface PageUnite {
  code: string;
  matiere: string;
  niveau: string;
  series: string[];
  chapitres: ChapitreCatalogue[];
}

/** Une unité du référentiel de l'élève et ses chapitres validés, avec la progression de l'élève. */
export function unite(utilisateur: string, codeUnite: string): Promise<PageUnite | null> {
  return avecUtilisateur(utilisateur, async (client) => {
    const eleve = await contexte(client, utilisateur);
    if (!eleve) return null;
    const { rows } = await client.query(
      `select u.id, u.code, coalesce(u.libelle_local, m.libelle) as matiere, n.libelle as niveau,
         coalesce((select array_agg(s.code order by s.code) from unites_series us join series s on s.id = us.serie_id
                   where us.unite_id = u.id), '{}') as series
       from unites u join matieres m on m.id = u.matiere_id join niveaux n on n.id = u.niveau_id
       where u.code = $1 and u.referentiel_id = $2`,
      [codeUnite, eleve.referentielId],
    );
    const u = rows[0];
    if (!u) return null;
    const chapitres = (
      await client.query(
        `select c.code, c.ordre, c.titre, c.sous_themes as "sousThemes", coalesce(p.statut, 'a_voir') as statut
         from chapitres c left join progression p on p.chapitre_id = c.id and p.eleve_id = $2
         where c.unite_id = $1 order by c.ordre`,
        [u.id, utilisateur],
      )
    ).rows as ChapitreCatalogue[];
    return { code: u.code, matiere: u.matiere, niveau: u.niveau, series: u.series, chapitres };
  });
}
