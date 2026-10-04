-- Validation humaine et signalements.
-- Une validation n'existe que si elle est enregistrée ici par un enseignant-référent (valideur, date, version, empreinte).

create type decision_validation as enum ('valide', 'rejete');
create type motif_signalement as enum (
  'detresse', 'hors_programme', 'erreur_contenu', 'demande_reponses', 'contenu_inapproprie', 'autre'
);

create table approbations (
  id uuid primary key default gen_random_uuid(),
  objet_type text not null check (objet_type in ('chapitre')),
  objet_id uuid not null,
  version integer not null,
  empreinte text not null,
  decision decision_validation not null,
  commentaire text,
  valideur_id uuid not null references profils (id),
  decide_le timestamptz not null default now()
);

create index on approbations (objet_type, objet_id);

create table signalements (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  motif motif_signalement not null,
  priorite smallint not null check (priorite between 1 and 3), -- 1 = immédiat
  eleve_id uuid references eleves (id) on delete set null,
  chapitre_id uuid references chapitres (id) on delete set null,
  resume text not null check (char_length(resume) <= 2000),
  cree_le timestamptz not null default now(),
  traite_le timestamptz,
  traite_par uuid references profils (id)
);

-- La détresse est toujours prioritaire, quelle que soit la priorité demandée.
create function signalements_avant_insertion() returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.motif = 'detresse' then
    new.priorite := 1;
  end if;
  return new;
end;
$$;

create trigger signalements_avant_insertion
before insert on signalements
for each row execute function signalements_avant_insertion();

-- ---------------------------------------------------------------------------
-- Fonctions d'aide aux règles d'accès (security definer pour éviter les boucles de règles).
-- ---------------------------------------------------------------------------

create function role_courant() returns role_compte
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select role from profils where id = auth.uid()
$$;

create function est_referent_du_chapitre(p_chapitre_id uuid) returns boolean
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from chapitres c
    join unites u on u.id = c.unite_id
    join matieres m on m.id = u.matiere_id
    join referents_familles rf
      on rf.referentiel_id = u.referentiel_id and rf.famille = m.famille
    where c.id = p_chapitre_id and rf.referent_id = auth.uid()
  )
$$;

create function est_referent() returns boolean
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select exists (select 1 from referents_familles where referent_id = auth.uid())
$$;

-- ---------------------------------------------------------------------------
-- Validation d'un chapitre par un enseignant-référent de sa famille de matières.
-- ---------------------------------------------------------------------------

create function valider_chapitre(
  p_chapitre_id uuid,
  p_decision decision_validation,
  p_version integer,
  p_commentaire text default null
) returns uuid
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_chapitre chapitres%rowtype;
  v_id uuid;
begin
  if auth.uid() is null or not est_referent_du_chapitre(p_chapitre_id) then
    raise exception 'Validation refusée : seul un enseignant-référent de cette famille de matières peut valider.'
      using errcode = '42501';
  end if;

  select * into v_chapitre from chapitres where id = p_chapitre_id for update;

  -- Le référent valide la version qu'il a relue : si le chapitre a changé depuis, il doit relire.
  if v_chapitre.version <> p_version then
    raise exception 'Le chapitre a été modifié (version % au lieu de %) : relecture nécessaire.',
      v_chapitre.version, p_version
      using errcode = '40001';
  end if;

  insert into approbations (objet_type, objet_id, version, empreinte, decision, commentaire, valideur_id)
  values ('chapitre', p_chapitre_id, v_chapitre.version, v_chapitre.empreinte, p_decision, p_commentaire, auth.uid())
  returning id into v_id;

  update chapitres
  set statut = case p_decision when 'valide' then 'valide'::statut_validation else 'rejete'::statut_validation end
  where id = p_chapitre_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Inscription d'un élève (ADR 0004) et confirmation par un parent ou tuteur.
-- ---------------------------------------------------------------------------

-- Renvoie le jeton de confirmation parentale en clair (une seule fois) si l'élève est mineur, sinon null.
create function inscrire_eleve(
  p_prenom_ou_pseudo text,
  p_referentiel_code text,
  p_niveau_code text,
  p_serie_code text,
  p_est_mineur boolean,
  p_contact_parent text default null,
  p_etablissement text default null
) returns text
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_referentiel_id uuid;
  v_niveau niveaux%rowtype;
  v_serie_id uuid;
  v_jeton text;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise.' using errcode = '42501';
  end if;
  if exists (select 1 from profils where id = auth.uid()) then
    raise exception 'Ce compte est déjà inscrit.' using errcode = '23505';
  end if;

  select id into v_referentiel_id from referentiels where code = p_referentiel_code;
  if v_referentiel_id is null then
    raise exception 'Référentiel inconnu.' using errcode = '22023';
  end if;

  select * into v_niveau from niveaux where referentiel_id = v_referentiel_id and code = p_niveau_code;
  if v_niveau.id is null then
    raise exception 'Classe inconnue pour ce référentiel.' using errcode = '22023';
  end if;

  if p_serie_code is not null then
    select id into v_serie_id from series where referentiel_id = v_referentiel_id and code = p_serie_code;
    if v_serie_id is null then
      raise exception 'Série inconnue pour ce référentiel.' using errcode = '22023';
    end if;
  end if;
  if v_niveau.series_obligatoires and v_serie_id is null then
    raise exception 'Une série est obligatoire pour cette classe.' using errcode = '22023';
  end if;
  if not v_niveau.series_obligatoires and v_serie_id is not null then
    raise exception 'Cette classe n''a pas de série.' using errcode = '22023';
  end if;

  if p_est_mineur and coalesce(trim(p_contact_parent), '') = '' then
    raise exception 'Le contact d''un parent ou tuteur est obligatoire pour un élève mineur.' using errcode = '22023';
  end if;

  insert into profils (id, role, prenom_ou_pseudo) values (auth.uid(), 'eleve', trim(p_prenom_ou_pseudo));
  insert into eleves (id, referentiel_id, niveau_id, serie_id, etablissement, est_mineur, statut)
  values (
    auth.uid(), v_referentiel_id, v_niveau.id, v_serie_id, nullif(trim(p_etablissement), ''), p_est_mineur,
    case when p_est_mineur then 'en_attente_parent'::statut_compte else 'actif'::statut_compte end
  );

  if p_est_mineur then
    -- Deux UUID aléatoires (244 bits d'aléa) : fonctions natives, sans extension.
    v_jeton := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
    insert into consentements (eleve_id, type, contact_parent, empreinte_jeton)
    values (auth.uid(), 'inscription', trim(p_contact_parent), encode(sha256(convert_to(v_jeton, 'UTF8')), 'hex'));
  end if;

  return v_jeton;
end;
$$;

-- Appelée depuis le lien envoyé au parent (sans compte). Active le compte de l'élève.
create function confirmer_consentement_parent(p_jeton text) returns boolean
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_consentement consentements%rowtype;
begin
  select * into v_consentement
  from consentements
  where empreinte_jeton = encode(sha256(convert_to(coalesce(p_jeton, ''), 'UTF8')), 'hex')
    and type = 'inscription' and accorde_le is null and revoque_le is null
  for update;

  if v_consentement.id is null then
    return false;
  end if;

  update consentements set accorde_le = now(), empreinte_jeton = null where id = v_consentement.id;
  update eleves set statut = 'actif' where id = v_consentement.eleve_id and statut = 'en_attente_parent';
  return true;
end;
$$;
