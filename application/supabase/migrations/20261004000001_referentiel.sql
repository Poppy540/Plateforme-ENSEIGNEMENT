-- Référentiels pédagogiques multi-pays (ADR 0001, 0002).
-- Aucune donnée propre à un pays ici : les valeurs viennent des packs pays (referentiels/<pays>/).

create type statut_validation as enum ('a_valider', 'valide', 'rejete');
create type couche_contenu as enum ('universel', 'adaptable', 'local');
create type nature_prerequis as enum ('strict', 'souple');

create table pays (
  code text primary key,
  nom text not null,
  langue_enseignement text not null,
  fuseau_horaire text not null,
  monnaie text,
  statut_pack text not null default 'en_preparation'
    check (statut_pack in ('en_preparation', 'pilote', 'ouvert'))
);

create table referentiels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  pays_code text not null references pays (code),
  version text not null,
  date_validation date,
  source_officielle text
);

create table niveaux (
  id uuid primary key default gen_random_uuid(),
  referentiel_id uuid not null references referentiels (id) on delete cascade,
  code text not null,
  libelle text not null,
  cycle text not null,
  ordre integer not null,
  code_interne text not null,
  series_obligatoires boolean not null default false,
  unique (referentiel_id, code),
  unique (referentiel_id, ordre)
);

create table series (
  id uuid primary key default gen_random_uuid(),
  referentiel_id uuid not null references referentiels (id) on delete cascade,
  code text not null,
  libelle text not null,
  type text not null,
  code_interne text not null,
  unique (referentiel_id, code)
);

create table matieres (
  id uuid primary key default gen_random_uuid(),
  referentiel_id uuid not null references referentiels (id) on delete cascade,
  code text not null,
  libelle text not null,
  famille text not null,
  couche couche_contenu not null,
  unique (referentiel_id, code)
);

create table unites (
  id uuid primary key default gen_random_uuid(),
  referentiel_id uuid not null references referentiels (id) on delete cascade,
  code text not null unique,
  niveau_id uuid not null references niveaux (id),
  matiere_id uuid not null references matieres (id),
  libelle_local text,
  statut statut_validation not null default 'a_valider'
);

-- Une unité peut couvrir plusieurs séries ; aucune ligne = toutes les séries ou niveau sans série.
create table unites_series (
  unite_id uuid not null references unites (id) on delete cascade,
  serie_id uuid not null references series (id) on delete cascade,
  primary key (unite_id, serie_id)
);

create table chapitres (
  id uuid primary key default gen_random_uuid(),
  unite_id uuid not null references unites (id) on delete cascade,
  code text not null,
  ordre integer not null,
  titre text not null,
  sous_themes text[] not null default '{}',
  volume_horaire numeric,
  coefficient numeric,
  couche couche_contenu,
  statut statut_validation not null default 'a_valider',
  version integer not null default 1,
  empreinte text not null default '',
  unique (unite_id, code)
);

create table prerequis_chapitres (
  chapitre_id uuid not null references chapitres (id) on delete cascade,
  prerequis_id uuid not null references chapitres (id) on delete cascade,
  nature nature_prerequis not null default 'strict',
  statut statut_validation not null default 'a_valider',
  primary key (chapitre_id, prerequis_id),
  check (chapitre_id <> prerequis_id)
);

create index on unites (niveau_id);
create index on chapitres (unite_id, ordre);

-- Empreinte du contenu d'un chapitre : toute modification du contenu change l'empreinte.
create function empreinte_chapitre(titre text, sous_themes text[]) returns text
language sql immutable
set search_path = pg_catalog, public
as $$
  select encode(sha256(convert_to(titre || E'\x1f' || array_to_string(sous_themes, E'\x1e'), 'UTF8')), 'hex')
$$;

-- Un chapitre validé dont le contenu change repasse « à valider », avec une nouvelle version.
create function chapitres_avant_ecriture() returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.empreinte := empreinte_chapitre(new.titre, new.sous_themes);
  if tg_op = 'UPDATE' and new.empreinte is distinct from old.empreinte then
    new.version := old.version + 1;
    new.statut := 'a_valider';
  end if;
  return new;
end;
$$;

create trigger chapitres_avant_ecriture
before insert or update on chapitres
for each row execute function chapitres_avant_ecriture();
