// Transforme un pack pays en SQL idempotent (relançable sans doublon).
// Règle : l'import ne valide jamais rien. Les unités et chapitres créés sont « à valider » ;
// un chapitre déjà validé dont le contenu change repasse « à valider » (déclencheur en base).
import type { Chapitre, PackPays } from "./lecture.ts";

function texteSql(valeur: string | null): string {
  return valeur === null ? "null" : `'${valeur.replaceAll("'", "''")}'`;
}

function nombreSql(valeur: number | null): string {
  return valeur === null ? "null" : String(valeur);
}

function tableauSql(valeurs: string[]): string {
  return valeurs.length === 0
    ? "'{}'::text[]"
    : `array[${valeurs.map(texteSql).join(", ")}]::text[]`;
}

const referentielSql = (code: string) =>
  `(select id from referentiels where code = ${texteSql(code)})`;

export function packEnSql(pack: PackPays): string {
  const { pays, referentiel } = pack;
  const ref = referentielSql(referentiel.code);
  const lignes: string[] = [
    `-- Import du pack pays « ${pays.code} » (référentiel ${referentiel.code}, version ${referentiel.version}).`,
    "-- Généré automatiquement depuis referentiels/ : ne pas modifier à la main.",
    "begin;",
    `insert into pays (code, nom, langue_enseignement, fuseau_horaire, monnaie, statut_pack, age_majorite, conservation, indicatifs_telephone)
values (${texteSql(pays.code)}, ${texteSql(pays.nom)}, ${texteSql(pays.langueEnseignement)}, ${texteSql(pays.fuseauHoraire)}, ${texteSql(pays.monnaie)}, ${texteSql(pays.statutPack)}, ${nombreSql(pays.ageMajorite)}, ${texteSql(JSON.stringify({ ...pays.conservation, resumes_apres_suppression: pays.resumesApresSuppression }))}::jsonb, ${tableauSql(pays.indicatifsTelephone)})
on conflict (code) do update set nom = excluded.nom, langue_enseignement = excluded.langue_enseignement,
  fuseau_horaire = excluded.fuseau_horaire, monnaie = excluded.monnaie, statut_pack = excluded.statut_pack,
  age_majorite = excluded.age_majorite, conservation = excluded.conservation,
  indicatifs_telephone = excluded.indicatifs_telephone;`,
    `insert into referentiels (code, pays_code, version, date_validation, source_officielle)
values (${texteSql(referentiel.code)}, ${texteSql(pays.code)}, ${texteSql(referentiel.version)}, ${texteSql(referentiel.dateValidation)}, ${texteSql(referentiel.sourceOfficielle)})
on conflict (code) do update set version = excluded.version, date_validation = excluded.date_validation,
  source_officielle = excluded.source_officielle;`,
  ];

  // Les ordres de niveaux peuvent être permutés : on les décale d'abord pour éviter les conflits d'unicité.
  lignes.push(`update niveaux set ordre = ordre + 100000 where referentiel_id = ${ref};`);
  for (const n of pack.niveaux) {
    lignes.push(`insert into niveaux (referentiel_id, code, libelle, cycle, ordre, code_interne, series_obligatoires)
values (${ref}, ${texteSql(n.code)}, ${texteSql(n.libelle)}, ${texteSql(n.cycle)}, ${n.ordre}, ${texteSql(n.codeInterne)}, ${n.seriesObligatoires})
on conflict (referentiel_id, code) do update set libelle = excluded.libelle, cycle = excluded.cycle,
  ordre = excluded.ordre, code_interne = excluded.code_interne, series_obligatoires = excluded.series_obligatoires;`);
  }

  for (const s of pack.series) {
    lignes.push(`insert into series (referentiel_id, code, libelle, type, code_interne)
values (${ref}, ${texteSql(s.code)}, ${texteSql(s.libelle)}, ${texteSql(s.type)}, ${texteSql(s.codeInterne)})
on conflict (referentiel_id, code) do update set libelle = excluded.libelle, type = excluded.type,
  code_interne = excluded.code_interne;`);
  }

  for (const m of pack.matieres) {
    lignes.push(`insert into matieres (referentiel_id, code, libelle, famille, couche)
values (${ref}, ${texteSql(m.code)}, ${texteSql(m.libelle)}, ${texteSql(m.famille)}, ${texteSql(m.couche)})
on conflict (referentiel_id, code) do update set libelle = excluded.libelle, famille = excluded.famille,
  couche = excluded.couche;`);
  }

  for (const u of pack.unites) {
    lignes.push(`insert into unites (referentiel_id, code, niveau_id, matiere_id, libelle_local)
values (${ref}, ${texteSql(u.code)},
  (select id from niveaux where referentiel_id = ${ref} and code = ${texteSql(u.niveau)}),
  (select id from matieres where referentiel_id = ${ref} and code = ${texteSql(u.matiere)}),
  ${texteSql(u.libelleLocal)})
on conflict (code) do update set niveau_id = excluded.niveau_id, matiere_id = excluded.matiere_id,
  libelle_local = excluded.libelle_local;`);
    const unite = `(select id from unites where code = ${texteSql(u.code)})`;
    lignes.push(`delete from unites_series where unite_id = ${unite};`);
    for (const s of u.series) {
      lignes.push(`insert into unites_series (unite_id, serie_id)
values (${unite}, (select id from series where referentiel_id = ${ref} and code = ${texteSql(s)}));`);
    }
  }

  for (const [codeUnite, chapitres] of Object.entries(pack.programmes)) {
    lignes.push(...chapitresEnSql(codeUnite, chapitres));
  }
  // Graphe proposé : un lien nouveau entre « à valider » ; un lien existant garde la décision du référent.
  for (const l of pack.prerequis) {
    const chapitre = (r: { unite: string; code: string }) =>
      `(select c.id from chapitres c join unites u on u.id = c.unite_id where u.code = ${texteSql(r.unite)} and c.code = ${texteSql(r.code)})`;
    lignes.push(
      `insert into prerequis_chapitres (chapitre_id, prerequis_id, nature)
values (${chapitre(l.chapitre)}, ${chapitre(l.prerequis)}, ${texteSql(l.nature)})
on conflict (chapitre_id, prerequis_id) do nothing;`,
    );
  }

  // Questionnaire anonyme (ADR 0052) : une version déjà répondue ne change plus (refusé par la base).
  if (pack.questionnaire) {
    const q = pack.questionnaire;
    lignes.push(`insert into questionnaires (referentiel_id, version, statut, questions)
values (${ref}, ${texteSql(q.version)}, ${texteSql(q.statut)}, ${texteSql(JSON.stringify(q.questions))}::jsonb)
on conflict (referentiel_id, version) do update set statut = excluded.statut, questions = excluded.questions;`);
  }

  lignes.push("commit;");
  return lignes.join("\n") + "\n";
}

function chapitresEnSql(codeUnite: string, chapitres: Chapitre[]): string[] {
  const unite = `(select id from unites where code = ${texteSql(codeUnite)})`;
  return chapitres.map(
    (
      c,
    ) => `insert into chapitres (unite_id, code, ordre, titre, sous_themes, volume_horaire, coefficient)
values (${unite}, ${texteSql(c.code)}, ${c.ordre}, ${texteSql(c.titre)}, ${tableauSql(c.sousThemes)}, ${nombreSql(c.volumeHoraire)}, ${nombreSql(c.coefficient)})
on conflict (unite_id, code) do update set ordre = excluded.ordre, titre = excluded.titre,
  sous_themes = excluded.sous_themes, volume_horaire = excluded.volume_horaire, coefficient = excluded.coefficient;`,
  );
}
