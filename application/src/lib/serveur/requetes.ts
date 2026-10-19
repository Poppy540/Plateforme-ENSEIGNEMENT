import "server-only";
import { DatabaseError } from "pg";
import { avecUtilisateur, avecVisiteur } from "./base";

export interface ProfilEleve {
  prenom: string;
  statut: "en_attente_parent" | "actif" | "suspendu";
  niveau: string;
  serie: string | null;
}

export async function profilEleve(utilisateur: string): Promise<ProfilEleve | null> {
  return avecUtilisateur(utilisateur, async (client) => {
    const { rows } = await client.query(
      `select p.prenom_ou_pseudo as prenom, e.statut, n.libelle as niveau, s.libelle as serie
       from profils p
       join eleves e on e.id = p.id
       join niveaux n on n.id = e.niveau_id
       left join series s on s.id = e.serie_id
       where p.id = $1`,
      [utilisateur],
    );
    return (rows[0] as ProfilEleve | undefined) ?? null;
  });
}

export async function aUnProfil(utilisateur: string): Promise<boolean> {
  return avecUtilisateur(utilisateur, async (client) => {
    const { rowCount } = await client.query("select 1 from profils where id = $1", [utilisateur]);
    return (rowCount ?? 0) > 0;
  });
}

export interface OptionsInscription {
  referentiels: {
    code: string;
    pays: string;
    ageMajorite: number | null;
    niveaux: { code: string; libelle: string; seriesObligatoires: boolean }[];
    series: { code: string; libelle: string }[];
  }[];
}

/** Classes et séries proposées à l'inscription, lues dans les référentiels (jamais dans le code). */
export async function optionsInscription(): Promise<OptionsInscription> {
  return avecVisiteur(async (client) => {
    const { rows } = await client.query(
      `select r.code, p.nom as pays, p.age_majorite,
         (select coalesce(json_agg(json_build_object('code', n.code, 'libelle', n.libelle,
            'seriesObligatoires', n.series_obligatoires) order by n.ordre), '[]')
          from niveaux n where n.referentiel_id = r.id) as niveaux,
         (select coalesce(json_agg(json_build_object('code', s.code, 'libelle', s.libelle) order by s.code), '[]')
          from series s where s.referentiel_id = r.id) as series
       from referentiels r join pays p on p.code = r.pays_code
       order by p.nom, r.code`,
    );
    return {
      referentiels: rows.map((r) => ({
        code: r.code,
        pays: r.pays,
        ageMajorite: r.age_majorite,
        niveaux: r.niveaux,
        series: r.series,
      })),
    };
  });
}

export interface DemandeInscription {
  prenom: string;
  referentiel: string;
  niveau: string;
  serie: string | null;
  estMineur: boolean;
  contactParent: string | null;
  etablissement: string | null;
}

/** Inscrit l'élève connecté. Renvoie l'identifiant de la demande d'accord parental (élève mineur) ou null. */
export async function inscrire(
  utilisateur: string,
  demande: DemandeInscription,
): Promise<string | null> {
  return avecUtilisateur(utilisateur, async (client) => {
    const { rows } = await client.query(
      "select inscrire_eleve($1, $2, $3, $4, $5, $6, $7) as jeton",
      [
        demande.prenom,
        demande.referentiel,
        demande.niveau,
        demande.serie,
        demande.estMineur,
        demande.contactParent,
        demande.etablissement,
      ],
    );
    return rows[0].jeton as string | null;
  });
}

export async function confirmerParent(jeton: string): Promise<boolean> {
  return avecVisiteur(async (client) => {
    const { rows } = await client.query("select confirmer_consentement_parent($1) as ok", [jeton]);
    return rows[0].ok === true;
  });
}

/** Message lisible pour les erreurs métier levées par la base (codes 22023 et 23505), sinon null. */
export function messageErreurMetier(erreur: unknown): string | null {
  if (erreur instanceof DatabaseError && (erreur.code === "22023" || erreur.code === "23505")) {
    return erreur.message;
  }
  return null;
}
