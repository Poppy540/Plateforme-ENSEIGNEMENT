-- Comptes, élèves, consentements et progression (ADR 0003, 0004, 0013).
-- Minimisation : prénom ou pseudonyme seulement, pas de nom de famille, établissement facultatif.

create type role_compte as enum ('eleve', 'parent', 'referent', 'administrateur');
create type statut_compte as enum ('en_attente_parent', 'actif', 'suspendu');
create type type_consentement as enum ('inscription', 'rapport_parents', 'voix_image');
create type statut_progression as enum ('a_voir', 'en_cours', 'termine');

-- Un profil par compte d'authentification (auth.users, géré par Supabase).
create table profils (
  id uuid primary key references auth.users (id) on delete cascade,
  role role_compte not null,
  prenom_ou_pseudo text not null check (char_length(prenom_ou_pseudo) between 1 and 40),
  cree_le timestamptz not null default now()
);

create table eleves (
  id uuid primary key references profils (id) on delete cascade,
  referentiel_id uuid not null references referentiels (id),
  niveau_id uuid not null references niveaux (id),
  serie_id uuid references series (id),
  etablissement text check (etablissement is null or char_length(etablissement) <= 120),
  est_mineur boolean not null,
  statut statut_compte not null
);

-- Consentements : parent ou tuteur pour l'inscription d'un mineur, rapports aux parents, voix ou image.
-- Le jeton de confirmation n'est jamais stocké en clair (empreinte SHA-256 seulement).
create table consentements (
  id uuid primary key default gen_random_uuid(),
  eleve_id uuid not null references eleves (id) on delete cascade,
  type type_consentement not null,
  contact_parent text,
  empreinte_jeton text unique,
  demande_le timestamptz not null default now(),
  accorde_le timestamptz,
  revoque_le timestamptz
);

-- Enseignants-référents : familles de matières qu'ils valident, par référentiel.
create table referents_familles (
  referent_id uuid not null references profils (id) on delete cascade,
  referentiel_id uuid not null references referentiels (id) on delete cascade,
  famille text not null,
  primary key (referent_id, referentiel_id, famille)
);

create table progression (
  eleve_id uuid not null references eleves (id) on delete cascade,
  chapitre_id uuid not null references chapitres (id) on delete cascade,
  statut statut_progression not null default 'a_voir',
  score numeric check (score is null or (score >= 0 and score <= 100)),
  maj_le timestamptz not null default now(),
  primary key (eleve_id, chapitre_id)
);

create index on consentements (eleve_id);
create index on progression (chapitre_id);
