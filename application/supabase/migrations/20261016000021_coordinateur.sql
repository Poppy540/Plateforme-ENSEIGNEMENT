-- Jalon 4, étape 2 : agent Coordinateur de famille de matières (ADR 0038 ; cadrage, Partie G ; §5.2).
-- Il lit le référentiel et les contenus VALIDÉS de sa seule famille (fixée par le serveur), des statistiques
-- agrégées à partir de 5 tentatives, et écrit des rapports au statut brouillon. Jamais de donnée d'élève.
-- Toute décision revient à un enseignant-référent de la famille.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'agent_coordinateur') then
    create role agent_coordinateur nologin noinherit;
  end if;
  grant agent_coordinateur to serveur_application;
end;
$$;
grant usage on schema public to agent_coordinateur;
grant execute on function contexte_agent(text) to agent_coordinateur;

/** Famille fixée par le serveur pour la transaction de l'agent (app.famille). */
create function famille_agent() returns text
language sql stable
set search_path = pg_catalog, public
as $$ select nullif(current_setting('app.famille', true), '') $$;

/** Chapitre du référentiel et de la famille fixés pour l'agent. */
create function chapitre_famille_agent(p_chapitre uuid) returns boolean
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from chapitres c join unites u on u.id = c.unite_id join matieres m on m.id = u.matiere_id
    where c.id = p_chapitre and u.referentiel_id = contexte_agent('referentiel_id') and m.famille = famille_agent()
  )
$$;

/** Le référent connecté couvre-t-il cette famille dans ce référentiel ? */
create function est_referent_famille(p_referentiel uuid, p_famille text) returns boolean
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from referents_familles
    where referent_id = auth.uid() and referentiel_id = p_referentiel and famille = p_famille
  )
$$;

revoke execute on function famille_agent(), chapitre_famille_agent(uuid), est_referent_famille(uuid, text)
  from public, anon;
grant execute on function famille_agent(), chapitre_famille_agent(uuid) to agent_coordinateur;
grant execute on function est_referent_famille(uuid, text) to authenticated;

-- Lecture : catalogue, chapitres et liens de la famille (tous statuts), contenus validés de la famille.
grant select on pays, referentiels, niveaux, series, matieres, unites, unites_series, chapitres,
  prerequis_chapitres to agent_coordinateur;
create policy catalogue_coordinateur on pays for select to agent_coordinateur using (true);
create policy catalogue_coordinateur on referentiels for select to agent_coordinateur using (true);
create policy catalogue_coordinateur on niveaux for select to agent_coordinateur using (true);
create policy catalogue_coordinateur on series for select to agent_coordinateur using (true);
create policy catalogue_coordinateur on matieres for select to agent_coordinateur using (true);
create policy catalogue_coordinateur on unites for select to agent_coordinateur using (true);
create policy catalogue_coordinateur on unites_series for select to agent_coordinateur using (true);
create policy chapitres_coordinateur on chapitres for select to agent_coordinateur
  using (chapitre_famille_agent(id));
create policy prerequis_coordinateur on prerequis_chapitres for select to agent_coordinateur
  using (chapitre_famille_agent(chapitre_id) and chapitre_famille_agent(prerequis_id));
grant select (id, chapitre_id, version, contenu, statut) on scripts to agent_coordinateur;
create policy scripts_coordinateur on scripts for select to agent_coordinateur
  using (statut = 'valide' and chapitre_famille_agent(chapitre_id));
grant select (id, chapitre_id, version, questions, statut) on quiz to agent_coordinateur;
create policy quiz_coordinateur on quiz for select to agent_coordinateur
  using (statut = 'valide' and chapitre_famille_agent(chapitre_id));

/**
 * Statistiques agrégées des quiz validés de la famille : taux de réussite par question, seulement pour les
 * quiz d'au moins 5 tentatives (un seuil plus bas est ignoré). Renvoie aussi le nombre de quiz écartés.
 */
create function statistiques_famille(p_minimum integer default 5)
returns table (quiz_id uuid, chapitre_id uuid, question integer, tentatives integer, taux_reussite numeric)
language sql stable security definer
set search_path = pg_catalog, public
as $$
  with eligibles as (
    select q.id, q.chapitre_id from quiz q
    where q.statut = 'valide' and chapitre_famille_agent(q.chapitre_id)
      and (select count(*) from tentatives_quiz t where t.quiz_id = q.id) >= greatest(p_minimum, 5)
  ), reponses as (
    select e.id as quiz_id, e.chapitre_id, (r ->> 'question')::int as question, (r ->> 'points')::numeric as points
    from eligibles e join tentatives_quiz t on t.quiz_id = e.id, jsonb_array_elements(t.reponses) r
  )
  select quiz_id, chapitre_id, question, count(*)::int, round(avg(points) * 100, 0)
  from reponses group by quiz_id, chapitre_id, question order by quiz_id, question
$$;

/** Nombre de quiz validés de la famille écartés des statistiques (moins de 5 tentatives, mais au moins une). */
create function quiz_trop_petits_famille() returns integer
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select count(*)::int from quiz q
  where q.statut = 'valide' and chapitre_famille_agent(q.chapitre_id)
    and (select count(*) from tentatives_quiz t where t.quiz_id = q.id) between 1 and 4
$$;
revoke execute on function statistiques_famille(integer), quiz_trop_petits_famille() from public, anon, authenticated;
grant execute on function statistiques_famille(integer), quiz_trop_petits_famille() to agent_coordinateur;

-- Signalements du Coordinateur (erreur factuelle dans un contenu publié, sujet sensible…) : jamais d'élève.
grant insert on signalements to agent_coordinateur;
create policy signalements_coordinateur on signalements for insert to agent_coordinateur
  with check (source = 'agent_coordinateur' and traite_le is null and eleve_id is null
              and (chapitre_id is null or chapitre_famille_agent(chapitre_id)));

-- ---------------------------------------------------------------------------------------------------------
-- Rapports de cohérence (brouillons) et décisions du référent sur leurs propositions.
-- ---------------------------------------------------------------------------------------------------------
create table rapports_coordinateur (
  id uuid primary key default gen_random_uuid(),
  referentiel_id uuid not null references referentiels (id) on delete cascade,
  famille text not null,
  version integer not null,
  contenu jsonb not null,
  controles jsonb not null default '[]'::jsonb,
  statut text not null default 'brouillon' check (statut in ('brouillon', 'traite')),
  demande_par uuid references profils (id) on delete set null,
  cree_le timestamptz not null default now(),
  traite_par uuid references profils (id) on delete set null,
  traite_le timestamptz,
  unique (referentiel_id, famille, version)
);
alter table rapports_coordinateur enable row level security;
revoke all on rapports_coordinateur from public, anon, authenticated;

-- Version suivante et statut brouillon imposés à la création ; le contenu ne change plus ensuite.
create function rapports_coordinateur_avant_insertion() returns trigger
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  new.version := coalesce((select max(version) from rapports_coordinateur
                           where referentiel_id = new.referentiel_id and famille = new.famille), 0) + 1;
  new.statut := 'brouillon';
  new.traite_par := null;
  new.traite_le := null;
  return new;
end;
$$;
create trigger rapports_coordinateur_avant_insertion before insert on rapports_coordinateur
  for each row execute function rapports_coordinateur_avant_insertion();

grant insert (referentiel_id, famille, contenu, controles, demande_par) on rapports_coordinateur to agent_coordinateur;
grant select (id, version) on rapports_coordinateur to agent_coordinateur;
create policy rapports_insertion_coordinateur on rapports_coordinateur for insert to agent_coordinateur
  with check (referentiel_id = contexte_agent('referentiel_id') and famille = famille_agent());
create policy rapports_retour_coordinateur on rapports_coordinateur for select to agent_coordinateur
  using (referentiel_id = contexte_agent('referentiel_id') and famille = famille_agent());
grant select on rapports_coordinateur to authenticated;
create policy rapports_lecture_referent on rapports_coordinateur for select to authenticated
  using (est_referent_famille(referentiel_id, famille) or role_courant() = 'administrateur');

create table decisions_coordinateur (
  rapport_id uuid not null references rapports_coordinateur (id) on delete cascade,
  nature text not null check (nature in ('lien', 'glossaire')),
  indice integer not null check (indice >= 0),
  decision text not null check (decision in ('acceptee', 'ecartee')),
  commentaire text check (char_length(commentaire) <= 1000),
  decide_par uuid not null references profils (id),
  decide_le timestamptz not null default now(),
  primary key (rapport_id, nature, indice)
);
alter table decisions_coordinateur enable row level security;
revoke all on decisions_coordinateur from public, anon, authenticated;
grant select on decisions_coordinateur to authenticated;
create policy decisions_lecture on decisions_coordinateur for select to authenticated
  using (exists (select 1 from rapports_coordinateur r where r.id = rapport_id
                 and (est_referent_famille(r.referentiel_id, r.famille) or role_courant() = 'administrateur')));

/** Charte de famille adoptée par un référent (glossaire et notations), versionnée ; lue par le Coordinateur. */
create table chartes_famille (
  referentiel_id uuid not null references referentiels (id) on delete cascade,
  famille text not null,
  version integer not null,
  glossaire jsonb not null,
  rapport_id uuid references rapports_coordinateur (id) on delete set null,
  adoptee_par uuid not null references profils (id),
  adoptee_le timestamptz not null default now(),
  primary key (referentiel_id, famille, version)
);
alter table chartes_famille enable row level security;
revoke all on chartes_famille from public, anon, authenticated;
grant select on chartes_famille to authenticated, agent_coordinateur;
create policy chartes_lecture on chartes_famille for select to authenticated
  using (est_referent_famille(referentiel_id, famille) or role_courant() = 'administrateur');
create policy chartes_coordinateur on chartes_famille for select to agent_coordinateur
  using (referentiel_id = contexte_agent('referentiel_id') and famille = famille_agent());

/** Chapitre désigné par « <unité>/<code> » dans un référentiel. */
create function chapitre_par_reference(p_referentiel uuid, p_reference text) returns uuid
language sql stable
set search_path = pg_catalog, public
as $$
  select c.id from chapitres c join unites u on u.id = c.unite_id
  where u.referentiel_id = p_referentiel and u.code || '/' || c.code = p_reference
$$;

/**
 * Le référent accepte un lien proposé par le Coordinateur : il devient un lien VALIDÉ du graphe, à condition
 * d'être référent des deux chapitres, que le prérequis ne soit pas d'une classe supérieure et que le lien ne
 * crée pas de cycle avec les liens non rejetés.
 */
create function accepter_lien_coordinateur(p_rapport uuid, p_indice integer) returns boolean
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  r rapports_coordinateur;
  v_lien jsonb;
  v_chapitre uuid;
  v_prerequis uuid;
begin
  select * into r from rapports_coordinateur where id = p_rapport;
  if r.id is null or not est_referent_famille(r.referentiel_id, r.famille) then
    raise exception 'Référent de la famille requis.' using errcode = '42501';
  end if;
  if exists (select 1 from decisions_coordinateur where rapport_id = p_rapport and nature = 'lien' and indice = p_indice) then
    raise exception 'Proposition déjà décidée.' using errcode = '22023';
  end if;
  v_lien := r.contenu -> 'propositions_liens' -> p_indice;
  v_chapitre := chapitre_par_reference(r.referentiel_id, v_lien ->> 'chapitre');
  v_prerequis := chapitre_par_reference(r.referentiel_id, v_lien ->> 'prerequis');
  if v_chapitre is null or v_prerequis is null or v_chapitre = v_prerequis then
    raise exception 'Lien inconnu.' using errcode = '22023';
  end if;
  if not (est_referent_du_chapitre(v_chapitre) and est_referent_du_chapitre(v_prerequis)) then
    raise exception 'Référent des deux chapitres requis.' using errcode = '42501';
  end if;
  if (select n.ordre from chapitres c join unites u on u.id = c.unite_id join niveaux n on n.id = u.niveau_id where c.id = v_prerequis)
     > (select n.ordre from chapitres c join unites u on u.id = c.unite_id join niveaux n on n.id = u.niveau_id where c.id = v_chapitre) then
    raise exception 'Prérequis d''une classe supérieure.' using errcode = '22023';
  end if;
  -- Cycle : le chapitre est-il déjà (directement ou non) un prérequis de son futur prérequis ?
  if exists (
    with recursive amont (id) as (
      select prerequis_id from prerequis_chapitres where chapitre_id = v_prerequis and statut <> 'rejete'
      union
      select p.prerequis_id from prerequis_chapitres p join amont a on p.chapitre_id = a.id where p.statut <> 'rejete'
    )
    select 1 from amont where id = v_chapitre
  ) then
    raise exception 'Ce lien créerait un cycle dans le graphe.' using errcode = '22023';
  end if;
  insert into prerequis_chapitres (chapitre_id, prerequis_id, nature, statut, decide_par, decide_le, commentaire)
  values (v_chapitre, v_prerequis, case when v_lien ->> 'nature' = 'souple' then 'souple' else 'strict' end::nature_prerequis,
          'valide', auth.uid(), now(), format('Proposé par le Coordinateur (rapport %s).', r.version))
  on conflict (chapitre_id, prerequis_id) do update
    set statut = 'valide', decide_par = auth.uid(), decide_le = now(), commentaire = excluded.commentaire;
  insert into decisions_coordinateur (rapport_id, nature, indice, decision, decide_par)
  values (p_rapport, 'lien', p_indice, 'acceptee', auth.uid());
  return true;
end;
$$;

/** Le référent écarte une proposition (lien ou glossaire), avec une remarque obligatoire. */
create function ecarter_proposition_coordinateur(p_rapport uuid, p_nature text, p_indice integer, p_commentaire text)
returns boolean
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare r rapports_coordinateur;
begin
  select * into r from rapports_coordinateur where id = p_rapport;
  if r.id is null or not est_referent_famille(r.referentiel_id, r.famille) then
    raise exception 'Référent de la famille requis.' using errcode = '42501';
  end if;
  if nullif(trim(p_commentaire), '') is null then
    raise exception 'Remarque obligatoire.' using errcode = '22023';
  end if;
  insert into decisions_coordinateur (rapport_id, nature, indice, decision, commentaire, decide_par)
  values (p_rapport, p_nature, p_indice, 'ecartee', trim(p_commentaire), auth.uid());
  return true;
end;
$$;

/** Le référent adopte le glossaire du rapport comme charte de la famille (nouvelle version). */
create function adopter_glossaire_coordinateur(p_rapport uuid) returns integer
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  r rapports_coordinateur;
  v_version integer;
begin
  select * into r from rapports_coordinateur where id = p_rapport;
  if r.id is null or not est_referent_famille(r.referentiel_id, r.famille) then
    raise exception 'Référent de la famille requis.' using errcode = '42501';
  end if;
  if jsonb_array_length(coalesce(r.contenu -> 'glossaire', '[]'::jsonb)) = 0 then
    raise exception 'Aucun glossaire dans ce rapport.' using errcode = '22023';
  end if;
  v_version := coalesce((select max(version) from chartes_famille
                         where referentiel_id = r.referentiel_id and famille = r.famille), 0) + 1;
  insert into chartes_famille (referentiel_id, famille, version, glossaire, rapport_id, adoptee_par)
  values (r.referentiel_id, r.famille, v_version, r.contenu -> 'glossaire', r.id, auth.uid());
  insert into decisions_coordinateur (rapport_id, nature, indice, decision, decide_par)
  values (p_rapport, 'glossaire', 0, 'acceptee', auth.uid())
  on conflict do nothing;
  return v_version;
end;
$$;

/** Le référent marque le rapport comme traité. */
create function clore_rapport_coordinateur(p_rapport uuid) returns boolean
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare v_n integer;
begin
  update rapports_coordinateur set statut = 'traite', traite_par = auth.uid(), traite_le = now()
  where id = p_rapport and statut = 'brouillon' and est_referent_famille(referentiel_id, famille);
  get diagnostics v_n = row_count;
  return v_n > 0;
end;
$$;

revoke execute on function chapitre_par_reference(uuid, text), accepter_lien_coordinateur(uuid, integer),
  ecarter_proposition_coordinateur(uuid, text, integer, text), adopter_glossaire_coordinateur(uuid),
  clore_rapport_coordinateur(uuid), rapports_coordinateur_avant_insertion() from public, anon;
grant execute on function accepter_lien_coordinateur(uuid, integer),
  ecarter_proposition_coordinateur(uuid, text, integer, text), adopter_glossaire_coordinateur(uuid),
  clore_rapport_coordinateur(uuid) to authenticated;
