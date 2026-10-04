-- Jalon 2 : scripts de cours, vidéos, quiz et tentatives (ADR 0020, 0021).
-- Principe : un contenu ne se modifie jamais. Tout changement crée une nouvelle version, à revalider.
-- Validation et publication : par un enseignant-référent de la famille de matières, jamais par un agent.

create type statut_contenu as enum ('brouillon', 'valide', 'rejete');
create type statut_video as enum ('a_relire', 'validee', 'rejetee', 'publiee');

create function empreinte_jsonb(contenu jsonb) returns text
language sql immutable
set search_path = pg_catalog, public
as $$
  select encode(sha256(convert_to(contenu::text, 'UTF8')), 'hex')
$$;

-- ---------------------------------------------------------------------------
-- Scripts (agent Scénariste) et quiz (agent Évaluateur) : versions immuables.
-- ---------------------------------------------------------------------------
create table scripts (
  id uuid primary key default gen_random_uuid(),
  chapitre_id uuid not null references chapitres (id) on delete cascade,
  version integer not null,
  contenu jsonb not null,
  duree_cible_minutes smallint not null check (duree_cible_minutes between 1 and 60),
  empreinte text not null default '',
  statut statut_contenu not null default 'brouillon',
  cree_par text not null,
  cree_le timestamptz not null default now(),
  unique (chapitre_id, version)
);

create table quiz (
  id uuid primary key default gen_random_uuid(),
  chapitre_id uuid not null references chapitres (id) on delete cascade,
  version integer not null,
  questions jsonb not null check (jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) between 1 and 30),
  empreinte text not null default '',
  statut statut_contenu not null default 'brouillon',
  cree_par text not null,
  cree_le timestamptz not null default now(),
  unique (chapitre_id, version)
);

-- À la création : version suivante du chapitre, empreinte calculée, statut brouillon imposé.
-- Ensuite : seul le statut peut changer (par les fonctions de validation) ; le contenu est figé.
create function contenus_versionnes() returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_contenu jsonb := case tg_table_name when 'scripts' then to_jsonb(new) -> 'contenu' else to_jsonb(new) -> 'questions' end;
begin
  if tg_op = 'INSERT' then
    execute format('select coalesce(max(version), 0) + 1 from %I where chapitre_id = $1', tg_table_name)
      into new.version using new.chapitre_id;
    new.empreinte := empreinte_jsonb(v_contenu);
    new.statut := 'brouillon';
    new.cree_le := now();
    return new;
  end if;
  if (to_jsonb(new) - 'statut') is distinct from (to_jsonb(old) - 'statut') then
    raise exception 'Contenu figé : créez une nouvelle version.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger scripts_versionnes before insert or update on scripts
for each row execute function contenus_versionnes();
create trigger quiz_versionnes before insert or update on quiz
for each row execute function contenus_versionnes();

-- ---------------------------------------------------------------------------
-- Vidéos (chaîne de production) : toujours rattachées à la version exacte d'un script validé.
-- ---------------------------------------------------------------------------
create table videos (
  id uuid primary key default gen_random_uuid(),
  script_id uuid not null references scripts (id) on delete restrict,
  script_version integer not null,
  script_empreinte text not null,
  statut statut_video not null default 'a_relire',
  reference_hebergement text not null,
  duree_secondes integer check (duree_secondes > 0),
  cout_usd numeric(10, 4) check (cout_usd >= 0),
  rapport jsonb not null default '{}'::jsonb,
  cree_le timestamptz not null default now()
);

create function videos_avant_insertion() returns trigger
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_script scripts%rowtype;
begin
  select * into v_script from scripts where id = new.script_id;
  if v_script.id is null or v_script.statut <> 'valide' then
    raise exception 'Production refusée : le script n''est pas validé.' using errcode = '42501';
  end if;
  if v_script.version <> new.script_version or v_script.empreinte <> new.script_empreinte then
    raise exception 'Production refusée : version ou empreinte du script différente de la version validée.'
      using errcode = '42501';
  end if;
  new.statut := 'a_relire';
  new.cree_le := now();
  return new;
end;
$$;

create trigger videos_avant_insertion before insert on videos
for each row execute function videos_avant_insertion();

-- ---------------------------------------------------------------------------
-- Tentatives de quiz : le score est écrit une seule fois, jamais modifié (prompt C3).
-- ---------------------------------------------------------------------------
create table tentatives_quiz (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quiz (id) on delete cascade,
  eleve_id uuid not null references eleves (id) on delete cascade,
  reponses jsonb not null,
  score numeric not null check (score between 0 and 100),
  corrige_le timestamptz not null default now()
);

create index on scripts (chapitre_id, version);
create index on quiz (chapitre_id, version);
create index on videos (script_id);
create index on tentatives_quiz (eleve_id, quiz_id);

-- ---------------------------------------------------------------------------
-- Validation et publication (référent de la famille de matières, version relue).
-- ---------------------------------------------------------------------------
alter table approbations drop constraint approbations_objet_type_check;
alter table approbations add constraint approbations_objet_type_check
  check (objet_type in ('chapitre', 'script', 'quiz', 'video', 'publication_video'));

create function valider_contenu(
  p_objet_type text,
  p_id uuid,
  p_decision decision_validation,
  p_version integer,
  p_commentaire text default null
) returns uuid
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_chapitre uuid;
  v_version integer;
  v_empreinte text;
  v_statut text;
  v_id uuid;
begin
  if p_objet_type = 'script' then
    select chapitre_id, version, empreinte, statut::text into v_chapitre, v_version, v_empreinte, v_statut
    from scripts where id = p_id for update;
  elsif p_objet_type = 'quiz' then
    select chapitre_id, version, empreinte, statut::text into v_chapitre, v_version, v_empreinte, v_statut
    from quiz where id = p_id for update;
  elsif p_objet_type = 'video' then
    select s.chapitre_id, v.script_version, v.script_empreinte, v.statut::text into v_chapitre, v_version, v_empreinte, v_statut
    from videos v join scripts s on s.id = v.script_id where v.id = p_id for update of v;
  else
    raise exception 'Type de contenu inconnu.' using errcode = '22023';
  end if;

  if v_chapitre is null then
    raise exception 'Contenu introuvable.' using errcode = '22023';
  end if;
  if auth.uid() is null or not est_referent_du_chapitre(v_chapitre) then
    raise exception 'Validation refusée : seul un enseignant-référent de cette famille de matières peut valider.'
      using errcode = '42501';
  end if;
  if p_version is null or p_version <> v_version then
    raise exception 'Version différente de la version relue : relecture nécessaire.' using errcode = '40001';
  end if;
  if v_statut not in ('brouillon', 'a_relire') then
    raise exception 'Ce contenu a déjà fait l''objet d''une décision.' using errcode = '22023';
  end if;

  insert into approbations (objet_type, objet_id, version, empreinte, decision, commentaire, valideur_id)
  values (p_objet_type, p_id, v_version, v_empreinte, p_decision, p_commentaire, auth.uid())
  returning id into v_id;

  if p_objet_type = 'script' then
    update scripts set statut = case p_decision when 'valide' then 'valide'::statut_contenu else 'rejete' end where id = p_id;
  elsif p_objet_type = 'quiz' then
    update quiz set statut = case p_decision when 'valide' then 'valide'::statut_contenu else 'rejete' end where id = p_id;
  else
    update videos set statut = case p_decision when 'valide' then 'validee'::statut_video else 'rejetee' end where id = p_id;
  end if;
  return v_id;
end;
$$;

-- Publication d'une vidéo validée : acte humain distinct de la validation.
create function publier_video(p_id uuid) returns uuid
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_video videos%rowtype;
  v_chapitre uuid;
  v_id uuid;
begin
  select v.* into v_video from videos v where v.id = p_id for update;
  select chapitre_id into v_chapitre from scripts where id = v_video.script_id;
  if v_video.id is null then
    raise exception 'Vidéo introuvable.' using errcode = '22023';
  end if;
  if auth.uid() is null or not est_referent_du_chapitre(v_chapitre) then
    raise exception 'Publication refusée.' using errcode = '42501';
  end if;
  if v_video.statut <> 'validee' then
    raise exception 'Seule une vidéo validée peut être publiée.' using errcode = '22023';
  end if;
  insert into approbations (objet_type, objet_id, version, empreinte, decision, valideur_id)
  values ('publication_video', p_id, v_video.script_version, v_video.script_empreinte, 'valide', auth.uid())
  returning id into v_id;
  update videos set statut = 'publiee' where id = p_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Rôles des agents du Jalon 2 (connexion via serveur_application, contexte fixé par le serveur).
-- ---------------------------------------------------------------------------
do $$
declare r text;
begin
  foreach r in array array['agent_scenariste', 'agent_production_video', 'agent_evaluateur'] loop
    if not exists (select 1 from pg_roles where rolname = r) then
      execute format('create role %I nologin noinherit', r);
    end if;
    execute format('grant %I to serveur_application', r);
    execute format('grant usage on schema public to %I', r);
  end loop;
end;
$$;

alter table scripts enable row level security;
alter table quiz enable row level security;
alter table videos enable row level security;
alter table tentatives_quiz enable row level security;
revoke all on scripts, quiz, videos, tentatives_quiz
  from anon, authenticated, agent_professeur, agent_scenariste, agent_production_video, agent_evaluateur;

-- Chapitre validé de l'unité de l'agent (sans les prérequis d'autres unités) : seul cas où il peut écrire.
create function chapitre_de_l_unite_agent(p_chapitre_id uuid) returns boolean
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from chapitres c
    where c.id = p_chapitre_id and c.statut = 'valide' and c.unite_id = contexte_agent('unite_id')
  )
$$;
revoke execute on function chapitre_de_l_unite_agent(uuid) from public, anon, authenticated;

-- Catalogue en lecture pour les nouveaux agents (chapitres : validés de leur unité seulement).
grant select on pays, referentiels, niveaux, series, matieres, unites, unites_series, chapitres, prerequis_chapitres
  to agent_scenariste, agent_evaluateur;
grant execute on function contexte_agent(text), chapitre_accessible_agent(uuid), chapitre_de_l_unite_agent(uuid)
  to agent_scenariste, agent_production_video, agent_evaluateur;
create policy catalogue_lecture_agents on pays for select to agent_scenariste, agent_evaluateur using (true);
create policy catalogue_lecture_agents on referentiels for select to agent_scenariste, agent_evaluateur using (true);
create policy catalogue_lecture_agents on niveaux for select to agent_scenariste, agent_evaluateur using (true);
create policy catalogue_lecture_agents on series for select to agent_scenariste, agent_evaluateur using (true);
create policy catalogue_lecture_agents on matieres for select to agent_scenariste, agent_evaluateur using (true);
create policy catalogue_lecture_agents on unites for select to agent_scenariste, agent_evaluateur using (true);
create policy catalogue_lecture_agents on unites_series for select to agent_scenariste, agent_evaluateur using (true);
create policy chapitres_lecture_agents on chapitres for select to agent_scenariste, agent_evaluateur
  using (chapitre_accessible_agent(id));
create policy prerequis_lecture_agents on prerequis_chapitres for select to agent_scenariste, agent_evaluateur
  using (statut = 'valide' and chapitre_accessible_agent(chapitre_id));

-- Scénariste : écrit des brouillons de scripts pour les chapitres validés de son unité, les relit.
grant select, insert (chapitre_id, contenu, duree_cible_minutes, cree_par) on scripts to agent_scenariste;
create policy scripts_scenariste_lecture on scripts for select to agent_scenariste
  using (chapitre_accessible_agent(chapitre_id));
create policy scripts_scenariste_insertion on scripts for insert to agent_scenariste
  with check (chapitre_de_l_unite_agent(chapitre_id) and cree_par = 'agent_scenariste');

-- Production vidéo : lit les scripts validés, dépose des vidéos « à relire » (le déclencheur vérifie le script).
grant select on scripts to agent_production_video;
create policy scripts_production_lecture on scripts for select to agent_production_video using (statut = 'valide');
grant select, insert (script_id, script_version, script_empreinte, reference_hebergement, duree_secondes, cout_usd, rapport)
  on videos to agent_production_video;
create policy videos_production on videos for select to agent_production_video using (true);
create policy videos_production_insertion on videos for insert to agent_production_video with check (true);

-- Évaluateur : brouillons de quiz pour son unité ; tentatives et scores de l'élève connecté (écriture unique).
grant select, insert (chapitre_id, questions, cree_par) on quiz to agent_evaluateur;
create policy quiz_evaluateur_lecture on quiz for select to agent_evaluateur using (chapitre_accessible_agent(chapitre_id));
create policy quiz_evaluateur_insertion on quiz for insert to agent_evaluateur
  with check (chapitre_de_l_unite_agent(chapitre_id) and cree_par = 'agent_evaluateur');
grant select, insert (quiz_id, eleve_id, reponses, score) on tentatives_quiz to agent_evaluateur;
create policy tentatives_evaluateur_lecture on tentatives_quiz for select to agent_evaluateur
  using (eleve_id = contexte_agent('eleve_id'));
create policy tentatives_evaluateur_insertion on tentatives_quiz for insert to agent_evaluateur
  with check (
    eleve_id = contexte_agent('eleve_id')
    and exists (select 1 from quiz q where q.id = quiz_id and q.statut = 'valide' and chapitre_de_l_unite_agent(q.chapitre_id))
  );

-- Référents : lisent les contenus de leur famille. Élèves : vidéos publiées et leurs propres tentatives.
-- Les élèves ne lisent jamais la table des quiz (elle contient les réponses) : les questions leur seront servies
-- sans les réponses par une fonction dédiée (Jalon 2, étape 4).
grant select on scripts, quiz, videos, tentatives_quiz to authenticated;
create policy scripts_referents on scripts for select to authenticated using (est_referent_du_chapitre(chapitre_id));
create policy quiz_referents on quiz for select to authenticated using (est_referent_du_chapitre(chapitre_id));
create policy videos_referents on videos for select to authenticated
  using (exists (select 1 from scripts s where s.id = script_id and est_referent_du_chapitre(s.chapitre_id)));
create function script_d_un_chapitre_valide(p_script_id uuid) returns boolean
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from scripts s join chapitres c on c.id = s.chapitre_id where s.id = p_script_id and c.statut = 'valide'
  )
$$;
revoke execute on function script_d_un_chapitre_valide(uuid) from public, anon;
grant execute on function script_d_un_chapitre_valide(uuid) to authenticated;
create policy videos_eleves on videos for select to authenticated
  using (statut = 'publiee' and script_d_un_chapitre_valide(script_id));
create policy tentatives_personnelles on tentatives_quiz for select to authenticated using (eleve_id = auth.uid());

revoke execute on function valider_contenu(text, uuid, decision_validation, integer, text), publier_video(uuid),
  empreinte_jsonb(jsonb) from public, anon;
grant execute on function valider_contenu(text, uuid, decision_validation, integer, text), publier_video(uuid)
  to authenticated;
grant execute on function empreinte_jsonb(jsonb) to agent_scenariste, agent_evaluateur, authenticated;
