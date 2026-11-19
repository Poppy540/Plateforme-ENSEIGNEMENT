-- Classes du pilote et vue de l'enseignant de la classe (Jalon 9, étape 2 ; ADR 0063).
--   - Une classe : un référentiel, un niveau (et une série éventuelle), un nom et un établissement. Créée par le
--     propriétaire (pnpm classe:creer), avec un code de classe que l'enseignant donne à ses élèves.
--   - L'élève rejoint sa classe avec ce code (ou la quitte). Une seule classe par élève.
--   - L'enseignant, invité par un code personnel comme un référent, ne lit AUCUNE donnée d'élève : seulement un
--     tableau agrégé calculé ici, où tout nombre de 1 à 4 élèves est masqué (petits nombres, comme les indicateurs
--     de l'administration). Les codes ne sont jamais gardés en clair (empreinte SHA-256).

create table classes (
  id uuid primary key default gen_random_uuid(),
  referentiel_id uuid not null references referentiels (id),
  niveau_id uuid not null references niveaux (id),
  serie_id uuid references series (id),
  nom text not null check (char_length(nom) between 1 and 60),
  etablissement text not null check (char_length(etablissement) between 1 and 120),
  empreinte_code text not null unique,
  code_expire_le timestamptz not null,
  cree_le timestamptz not null default now()
);
alter table classes enable row level security;
revoke all on classes from public, anon, authenticated;

create table invitations_enseignants (
  id uuid primary key default gen_random_uuid(),
  empreinte_code text not null unique,
  classe_id uuid not null references classes (id) on delete cascade,
  expire_le timestamptz not null,
  utilisee_le timestamptz,
  utilisee_par uuid references auth.users (id) on delete set null
);
alter table invitations_enseignants enable row level security;
revoke all on invitations_enseignants from public, anon, authenticated;

create table enseignants_classes (
  enseignant_id uuid not null references profils (id) on delete cascade,
  classe_id uuid not null references classes (id) on delete cascade,
  primary key (enseignant_id, classe_id)
);
alter table enseignants_classes enable row level security;
revoke all on enseignants_classes from public, anon, authenticated;

alter table eleves add column classe_id uuid references classes (id) on delete set null;
create index on eleves (classe_id);

create function empreinte_code_saisi(p_code text) returns text
language sql immutable
set search_path = pg_catalog
as $$ select encode(sha256(convert_to(upper(trim(coalesce(p_code, ''))), 'UTF8')), 'hex') $$;

-- ---------------------------------------------------------------------------
-- Élève : rejoindre ou quitter sa classe
-- ---------------------------------------------------------------------------
create function rejoindre_classe(p_code text) returns text
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_eleve eleves%rowtype;
  v_classe classes%rowtype;
begin
  select * into v_eleve from eleves where id = auth.uid();
  if v_eleve.id is null then
    raise exception 'Réservé aux élèves inscrits.' using errcode = '42501';
  end if;
  select * into v_classe from classes
  where empreinte_code = empreinte_code_saisi(p_code) and code_expire_le > now();
  if v_classe.id is null then
    raise exception 'Code de classe inconnu ou expiré.' using errcode = '22023';
  end if;
  if v_classe.referentiel_id <> v_eleve.referentiel_id or v_classe.niveau_id <> v_eleve.niveau_id
     or (v_classe.serie_id is not null and v_classe.serie_id is distinct from v_eleve.serie_id) then
    raise exception 'Ce code correspond à une autre classe que la tienne.' using errcode = '22023';
  end if;
  update eleves set classe_id = v_classe.id where id = v_eleve.id;
  return v_classe.nom;
end;
$$;
revoke execute on function rejoindre_classe(text) from public, anon;
grant execute on function rejoindre_classe(text) to authenticated;

create function quitter_classe() returns void
language sql security definer
set search_path = pg_catalog, public
as $$ update eleves set classe_id = null where id = auth.uid() $$;
revoke execute on function quitter_classe() from public, anon;
grant execute on function quitter_classe() to authenticated;

/** Nom de la classe de l'élève connecté (ou rien). */
create function ma_classe() returns table (nom text, etablissement text)
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select c.nom, c.etablissement from eleves e join classes c on c.id = e.classe_id where e.id = auth.uid()
$$;
revoke execute on function ma_classe() from public, anon;
grant execute on function ma_classe() to authenticated;

-- ---------------------------------------------------------------------------
-- Enseignant : activation et classes
-- ---------------------------------------------------------------------------
create function activer_enseignant(p_code text, p_prenom_ou_pseudo text) returns void
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_invitation invitations_enseignants%rowtype;
  v_role role_compte;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise.' using errcode = '42501';
  end if;
  select * into v_invitation from invitations_enseignants
  where empreinte_code = empreinte_code_saisi(p_code) and utilisee_le is null and expire_le > now()
  for update;
  if v_invitation.id is null then
    raise exception 'Code d''invitation invalide, expiré ou déjà utilisé.' using errcode = '22023';
  end if;
  select role into v_role from profils where id = auth.uid();
  if v_role is not null and v_role <> 'enseignant' then
    raise exception 'Ce compte est déjà utilisé avec un autre rôle.' using errcode = '22023';
  end if;
  if v_role is null then
    if coalesce(trim(p_prenom_ou_pseudo), '') = '' then
      raise exception 'Indiquez votre prénom ou un pseudonyme.' using errcode = '22023';
    end if;
    insert into profils (id, role, prenom_ou_pseudo) values (auth.uid(), 'enseignant', trim(p_prenom_ou_pseudo));
  end if;
  insert into enseignants_classes (enseignant_id, classe_id) values (auth.uid(), v_invitation.classe_id)
  on conflict do nothing;
  update invitations_enseignants set utilisee_le = now(), utilisee_par = auth.uid() where id = v_invitation.id;
end;
$$;
revoke execute on function activer_enseignant(text, text) from public, anon;
grant execute on function activer_enseignant(text, text) to authenticated;

create function mes_classes() returns table (id uuid, nom text, etablissement text, niveau text, serie text)
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select c.id, c.nom, c.etablissement, n.libelle, s.libelle
  from enseignants_classes ec
  join classes c on c.id = ec.classe_id
  join niveaux n on n.id = c.niveau_id
  left join series s on s.id = c.serie_id
  where ec.enseignant_id = auth.uid()
  order by c.etablissement, c.nom
$$;
revoke execute on function mes_classes() from public, anon;
grant execute on function mes_classes() to authenticated;

/** Petit nombre masqué : 1 à 4 élèves deviennent null (affiché « moins de 5 »). */
create function nombre_diffusable(n bigint) returns integer
language sql immutable
set search_path = pg_catalog
as $$ select case when n between 1 and 4 then null else n::integer end $$;

/**
 * Tableau agrégé d'une classe, pour son enseignant seulement. Aucune ligne n'est liée à un élève :
 *   - élèves rattachés et élèves actifs sur 7 jours ;
 *   - par chapitre validé des unités de la classe : élèves ayant commencé, terminé, passé le quiz, score moyen ;
 *   - notions les plus souvent manquées aux quiz (au moins 5 élèves concernés).
 * Tout est masqué sous 5 élèves ; si la classe compte moins de 5 élèves rattachés, rien d'autre n'est rendu.
 */
create function tableau_classe(p_classe uuid) returns jsonb
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
declare
  v_classe classes%rowtype;
  v_eleves bigint;
  v_actifs bigint;
  v_chapitres jsonb;
  v_notions jsonb;
begin
  if not exists (select 1 from enseignants_classes where enseignant_id = auth.uid() and classe_id = p_classe) then
    raise exception 'Classe inaccessible.' using errcode = '42501';
  end if;
  select * into v_classe from classes where id = p_classe;
  select count(*), count(*) filter (where p.derniere_activite > now() - interval '7 days')
    into v_eleves, v_actifs
  from eleves e join profils p on p.id = e.id
  where e.classe_id = p_classe and e.statut = 'actif';
  if v_eleves < 5 then
    return jsonb_build_object('eleves', nombre_diffusable(v_eleves), 'masque', true);
  end if;

  with membres as (
    select id from eleves where classe_id = p_classe and statut = 'actif'
  ), chapitres_classe as (
    select c.id, c.titre, c.ordre, u.code as unite, m.libelle as matiere
    from unites u
    join chapitres c on c.unite_id = u.id and c.statut = 'valide'
    join matieres m on m.id = u.matiere_id
    where u.referentiel_id = v_classe.referentiel_id and u.niveau_id = v_classe.niveau_id
      and (v_classe.serie_id is null
           or not exists (select 1 from unites_series us where us.unite_id = u.id)
           or exists (select 1 from unites_series us where us.unite_id = u.id and us.serie_id = v_classe.serie_id))
  ), meilleures as (
    -- Dernière tentative de chaque élève au quiz validé le plus récent de chaque chapitre.
    select q.chapitre_id, t.eleve_id, t.score
    from quiz q join tentatives_quiz t on t.quiz_id = q.id
    where q.statut = 'valide' and t.eleve_id in (select id from membres)
      and q.chapitre_id in (select id from chapitres_classe)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'matiere', cc.matiere,
      'chapitre', cc.titre,
      'commence', nombre_diffusable((select count(*) from progression p
        where p.chapitre_id = cc.id and p.statut in ('en_cours', 'termine') and p.eleve_id in (select id from membres))),
      'termine', nombre_diffusable((select count(*) from progression p
        where p.chapitre_id = cc.id and p.statut = 'termine' and p.eleve_id in (select id from membres))),
      'quiz', nombre_diffusable((select count(distinct m2.eleve_id) from meilleures m2 where m2.chapitre_id = cc.id)),
      'score_moyen', (select case when count(distinct m2.eleve_id) >= 5 then round(avg(m2.score)) end
        from meilleures m2 where m2.chapitre_id = cc.id)
    ) order by cc.matiere, cc.ordre), '[]'::jsonb)
  into v_chapitres
  from chapitres_classe cc;

  with membres as (
    select id from eleves where classe_id = p_classe and statut = 'actif'
  ), reponses as (
    select t.eleve_id, q.chapitre_id,
           q.questions -> (r ->> 'question')::int ->> 'notion' as notion,
           r -> 'correction' ->> 'resultat' as resultat
    from tentatives_quiz t
    join quiz q on q.id = t.quiz_id
    join chapitres c on c.id = q.chapitre_id
    join unites u on u.id = c.unite_id
    cross join lateral jsonb_array_elements(t.reponses) r
    where t.eleve_id in (select id from membres)
      and u.referentiel_id = v_classe.referentiel_id and u.niveau_id = v_classe.niveau_id
  ), par_notion as (
    select notion, min(chapitre_id::text)::uuid as chapitre_id,
           count(distinct eleve_id) as repondants,
           count(distinct eleve_id) filter (where resultat in ('faux', 'partiel', 'non_tente')) as en_difficulte
    from reponses where coalesce(notion, '') <> ''
    group by notion
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'notion', pn.notion, 'chapitre', c.titre,
      'en_difficulte', pn.en_difficulte, 'repondants', pn.repondants
    ) order by pn.en_difficulte::numeric / pn.repondants desc, pn.notion), '[]'::jsonb)
  into v_notions
  from (select * from par_notion where en_difficulte >= 5 order by en_difficulte::numeric / repondants desc limit 5) pn
  join chapitres c on c.id = pn.chapitre_id;

  return jsonb_build_object(
    'eleves', v_eleves,
    'actifs_7_jours', nombre_diffusable(v_actifs),
    'masque', false,
    'chapitres', v_chapitres,
    'notions', v_notions
  );
end;
$$;
revoke execute on function tableau_classe(uuid) from public, anon;
grant execute on function tableau_classe(uuid) to authenticated;
