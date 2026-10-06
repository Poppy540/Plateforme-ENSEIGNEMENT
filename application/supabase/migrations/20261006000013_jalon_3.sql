-- Jalon 3, étape 1 : données et droits des agents Tuteur, Support/inscription et Orchestrateur (ADR 0027, 0028).
-- Chaque agent a un rôle de base limité à sa ligne du §5.2 ; l'élève est fixé par le serveur (app.eleve_id).

do $$
declare r text;
begin
  foreach r in array array['agent_tuteur', 'agent_support', 'agent_orchestrateur'] loop
    if not exists (select 1 from pg_roles where rolname = r) then
      execute format('create role %I nologin noinherit', r);
    end if;
    execute format('grant %I to serveur_application', r);
    execute format('grant usage on schema public to %I', r);
  end loop;
end;
$$;
grant execute on function contexte_agent(text) to agent_tuteur, agent_support, agent_orchestrateur;

/** Consentement d'un type donné accordé et non révoqué pour cet élève. */
create function consentement_actif(p_eleve uuid, p_type type_consentement) returns boolean
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from consentements
    where eleve_id = p_eleve and type = p_type and accorde_le is not null and revoque_le is null
  )
$$;
revoke execute on function consentement_actif(uuid, type_consentement) from public, anon;
grant execute on function consentement_actif(uuid, type_consentement) to authenticated, agent_tuteur;

-- ---------------------------------------------------------------------------
-- Préférences de l'élève (Tuteur) : temps disponible, connexion, rappels (désactivés par défaut).
-- ---------------------------------------------------------------------------
create type qualite_connexion as enum ('lente', 'moyenne', 'bonne');
create type frequence_rappels as enum ('quotidienne', 'hebdomadaire');

create table preferences_eleves (
  eleve_id uuid primary key references eleves (id) on delete cascade,
  minutes_par_jour smallint check (minutes_par_jour between 5 and 240),
  connexion qualite_connexion,
  rappels_actifs boolean not null default false,
  frequence_rappels frequence_rappels not null default 'hebdomadaire',
  maj_le timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Recommandations du Tuteur (au plus trois priorités) et rapports aux parents (consentement obligatoire).
-- ---------------------------------------------------------------------------
create table recommandations_tuteur (
  id uuid primary key default gen_random_uuid(),
  eleve_id uuid not null references eleves (id) on delete cascade,
  priorites jsonb not null check (jsonb_typeof(priorites) = 'array' and jsonb_array_length(priorites) between 0 and 3),
  message text not null check (char_length(message) <= 2000),
  cree_le timestamptz not null default now()
);
create index on recommandations_tuteur (eleve_id, cree_le);

create type statut_rapport as enum ('prepare', 'envoye');
create table rapports_parents (
  id uuid primary key default gen_random_uuid(),
  eleve_id uuid not null references eleves (id) on delete cascade,
  consentement_id uuid not null references consentements (id) on delete cascade,
  periode text not null check (periode in ('hebdomadaire', 'a_la_demande')),
  contenu jsonb not null,
  statut statut_rapport not null default 'prepare',
  cree_le timestamptz not null default now(),
  envoye_le timestamptz
);
create index on rapports_parents (eleve_id, cree_le);

-- ---------------------------------------------------------------------------
-- Tickets du Support (jamais de code, de mot de passe ni de donnée bancaire dans le résumé).
-- ---------------------------------------------------------------------------
create type categorie_ticket as enum (
  'detresse', 'paiement_suppression', 'fraude_plainte', 'signalement_contenu', 'inscription', 'connexion',
  'choix_classe_serie', 'utilisation', 'question_cours', 'autre'
);
create type statut_ticket as enum ('ouvert', 'en_cours', 'resolu');
create table tickets_support (
  id uuid primary key default gen_random_uuid(),
  demandeur_id uuid references profils (id) on delete set null,
  categorie categorie_ticket not null,
  priorite smallint not null check (priorite between 1 and 3),
  resume text not null check (char_length(resume) between 1 and 2000),
  statut statut_ticket not null default 'ouvert',
  cree_le timestamptz not null default now(),
  traite_le timestamptz,
  traite_par uuid references profils (id)
);
create index on tickets_support (statut, priorite, cree_le);

-- La détresse est toujours en priorité 1, comme pour les signalements.
create function tickets_avant_insertion() returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.categorie = 'detresse' then
    new.priorite := 1;
  end if;
  return new;
end;
$$;
create trigger tickets_avant_insertion before insert on tickets_support
for each row execute function tickets_avant_insertion();

-- ---------------------------------------------------------------------------
-- Orchestrateur : file de tâches, état des agents, journal d'audit pseudonymisé.
-- ---------------------------------------------------------------------------
create type statut_tache as enum ('en_attente', 'en_cours', 'terminee', 'echouee', 'bloquee', 'suspendue');
create table taches (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type ~ '^[a-z_]{3,40}$'),
  agent text not null check (agent in (
    'professeur', 'scenariste', 'production_video', 'evaluateur', 'tuteur', 'conformite', 'support',
    'recruteur', 'coordinateur', 'humain'
  )),
  entrees jsonb not null default '{}'::jsonb,
  priorite smallint not null default 3 check (priorite between 1 and 3),
  statut statut_tache not null default 'en_attente',
  tentatives smallint not null default 0 check (tentatives >= 0),
  tentatives_max smallint not null default 3 check (tentatives_max between 1 and 5),
  -- Nombre de tâches engendrées par chaîne (limite contre les boucles entre agents).
  profondeur smallint not null default 0 check (profondeur between 0 and 10),
  tache_parente uuid references taches (id) on delete set null,
  approbation_id uuid references approbations (id),
  cout_usd numeric(10, 4) not null default 0 check (cout_usd >= 0),
  motif text,
  resultat jsonb,
  demandee_par uuid references profils (id) on delete set null,
  cree_le timestamptz not null default now(),
  debut_le timestamptz,
  fin_le timestamptz
);
create index on taches (statut, priorite, cree_le);

create table etat_agents (
  agent text primary key,
  suspendu boolean not null default false,
  motif text,
  maj_le timestamptz not null default now()
);
insert into etat_agents (agent) values
  ('professeur'), ('scenariste'), ('production_video'), ('evaluateur'), ('tuteur'), ('conformite'),
  ('support'), ('recruteur'), ('coordinateur');

-- L'Orchestrateur peut suspendre un agent, jamais le réactiver (réservé à l'administration).
create function etat_agents_avant_modification() returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if current_user = 'agent_orchestrateur' and (not new.suspendu or new.agent <> old.agent) then
    raise exception 'Seule l''administration réactive un agent.' using errcode = '42501';
  end if;
  new.maj_le := now();
  return new;
end;
$$;
create trigger etat_agents_avant_modification before update on etat_agents
for each row execute function etat_agents_avant_modification();

create table journal_audit (
  id bigint generated always as identity primary key,
  -- Acteur pseudonymisé : rôle (agent, référent, élève…) et empreinte de l'identifiant, jamais le nom.
  acteur text not null,
  acteur_empreinte text,
  action text not null,
  objet_type text,
  objet_id uuid,
  details jsonb not null default '{}'::jsonb,
  cree_le timestamptz not null default now()
);
create index on journal_audit (cree_le);

-- ---------------------------------------------------------------------------
-- Règles d'accès.
-- ---------------------------------------------------------------------------
alter table preferences_eleves enable row level security;
alter table recommandations_tuteur enable row level security;
alter table rapports_parents enable row level security;
alter table tickets_support enable row level security;
alter table taches enable row level security;
alter table etat_agents enable row level security;
alter table journal_audit enable row level security;
revoke all on preferences_eleves, recommandations_tuteur, rapports_parents, tickets_support, taches, etat_agents,
  journal_audit
  from anon, authenticated, agent_professeur, agent_scenariste, agent_production_video, agent_evaluateur,
  agent_tuteur, agent_support, agent_orchestrateur;

-- Élève : ses préférences (lecture et modification), ses recommandations, les rapports envoyés à ses parents.
grant select, insert (eleve_id, minutes_par_jour, connexion, rappels_actifs, frequence_rappels),
  update (minutes_par_jour, connexion, rappels_actifs, frequence_rappels, maj_le)
  on preferences_eleves to authenticated;
create policy preferences_personnelles on preferences_eleves for all to authenticated
  using (eleve_id = auth.uid()) with check (eleve_id = auth.uid());
grant select on recommandations_tuteur, rapports_parents to authenticated;
create policy recommandations_personnelles on recommandations_tuteur for select to authenticated
  using (eleve_id = auth.uid());
create policy rapports_personnels on rapports_parents for select to authenticated using (eleve_id = auth.uid());

-- Tuteur : lit la progression, les scores, les préférences et le catalogue de l'élève du contexte ;
-- écrit des recommandations, des rapports (seulement avec consentement actif) et des signalements.
grant select on pays, referentiels, niveaux, series, matieres, unites, unites_series, chapitres, prerequis_chapitres
  to agent_tuteur;
create policy catalogue_tuteur on pays for select to agent_tuteur using (true);
create policy catalogue_tuteur on referentiels for select to agent_tuteur using (true);
create policy catalogue_tuteur on niveaux for select to agent_tuteur using (true);
create policy catalogue_tuteur on series for select to agent_tuteur using (true);
create policy catalogue_tuteur on matieres for select to agent_tuteur using (true);
create policy catalogue_tuteur on unites for select to agent_tuteur using (true);
create policy catalogue_tuteur on unites_series for select to agent_tuteur using (true);
create policy chapitres_tuteur on chapitres for select to agent_tuteur using (statut = 'valide');
create policy prerequis_tuteur on prerequis_chapitres for select to agent_tuteur using (statut = 'valide');
grant select on eleves, progression, tentatives_quiz, preferences_eleves to agent_tuteur;
create policy eleve_tuteur on eleves for select to agent_tuteur using (id = contexte_agent('eleve_id'));
create policy progression_tuteur on progression for select to agent_tuteur
  using (eleve_id = contexte_agent('eleve_id'));
create policy tentatives_tuteur on tentatives_quiz for select to agent_tuteur
  using (eleve_id = contexte_agent('eleve_id'));
create policy preferences_tuteur on preferences_eleves for select to agent_tuteur
  using (eleve_id = contexte_agent('eleve_id'));
grant select, insert (eleve_id, priorites, message) on recommandations_tuteur to agent_tuteur;
create policy recommandations_tuteur_lecture on recommandations_tuteur for select to agent_tuteur
  using (eleve_id = contexte_agent('eleve_id'));
create policy recommandations_tuteur_insertion on recommandations_tuteur for insert to agent_tuteur
  with check (eleve_id = contexte_agent('eleve_id'));
grant select, insert (eleve_id, consentement_id, periode, contenu) on rapports_parents to agent_tuteur;
create policy rapports_tuteur_lecture on rapports_parents for select to agent_tuteur
  using (eleve_id = contexte_agent('eleve_id'));
create policy rapports_tuteur_insertion on rapports_parents for insert to agent_tuteur
  with check (
    eleve_id = contexte_agent('eleve_id')
    and exists (
      select 1 from consentements c
      where c.id = consentement_id and c.eleve_id = rapports_parents.eleve_id and c.type = 'rapport_parents'
        and c.accorde_le is not null and c.revoque_le is null
    )
  );
grant select (id, eleve_id, type, accorde_le, revoque_le) on consentements to agent_tuteur;
create policy consentements_tuteur on consentements for select to agent_tuteur
  using (eleve_id = contexte_agent('eleve_id'));
grant insert on signalements to agent_tuteur;
create policy signalements_tuteur on signalements for insert to agent_tuteur
  with check (
    source = 'agent_tuteur' and traite_le is null
    and (eleve_id is null or eleve_id = contexte_agent('eleve_id'))
  );

-- Support : statut d'inscription de l'utilisateur du contexte ; tickets et signalements pour lui seul.
grant select (id, statut, est_mineur, niveau_id, serie_id, referentiel_id) on eleves to agent_support;
create policy eleve_support on eleves for select to agent_support using (id = contexte_agent('eleve_id'));
grant select, insert (demandeur_id, categorie, priorite, resume) on tickets_support to agent_support;
create policy tickets_support_lecture on tickets_support for select to agent_support
  using (demandeur_id = contexte_agent('eleve_id'));
create policy tickets_support_insertion on tickets_support for insert to agent_support
  with check (demandeur_id is null or demandeur_id = contexte_agent('eleve_id'));
grant insert on signalements to agent_support;
create policy signalements_support on signalements for insert to agent_support
  with check (
    source = 'agent_support' and traite_le is null
    and (eleve_id is null or eleve_id = contexte_agent('eleve_id'))
  );
-- L'utilisateur voit ses propres tickets ; l'administration les traite.
grant select on tickets_support to authenticated;
create policy tickets_personnels on tickets_support for select to authenticated
  using (demandeur_id = auth.uid() or role_courant() = 'administrateur');

-- Orchestrateur : file de tâches, suspension des agents, journal d'audit, lecture des approbations et de la
-- file humaine (sans le texte des signalements) ; aucun droit sur les contenus ni sur les élèves.
grant select, insert, update (statut, tentatives, cout_usd, motif, resultat, debut_le, fin_le, priorite)
  on taches to agent_orchestrateur;
create policy taches_orchestrateur on taches for all to agent_orchestrateur using (true) with check (true);
grant select, update (suspendu, motif) on etat_agents to agent_orchestrateur;
create policy etat_orchestrateur on etat_agents for all to agent_orchestrateur using (true) with check (true);
grant select, insert (acteur, acteur_empreinte, action, objet_type, objet_id, details) on journal_audit
  to agent_orchestrateur;
create policy audit_orchestrateur on journal_audit for all to agent_orchestrateur using (true) with check (true);
grant select on approbations to agent_orchestrateur;
create policy approbations_orchestrateur on approbations for select to agent_orchestrateur using (true);
grant select (id, chapitre_id, statut, version, empreinte) on scripts to agent_orchestrateur;
grant select (id, script_id, statut) on videos to agent_orchestrateur;
create policy scripts_orchestrateur on scripts for select to agent_orchestrateur using (true);
create policy videos_orchestrateur on videos for select to agent_orchestrateur using (true);
grant select (id, source, motif, priorite, chapitre_id, cree_le, traite_le) on signalements to agent_orchestrateur;
create policy signalements_orchestrateur on signalements for select to agent_orchestrateur using (true);

-- Référents et administration : suivi des tâches qu'ils ont demandées (ou de toutes, pour l'administration).
grant select on taches, etat_agents to authenticated;
create policy taches_personnelles on taches for select to authenticated
  using (demandee_par = auth.uid() or role_courant() = 'administrateur');
create policy etat_agents_administration on etat_agents for select to authenticated
  using (role_courant() = 'administrateur');
grant select on journal_audit to authenticated;
create policy audit_administration on journal_audit for select to authenticated
  using (role_courant() = 'administrateur');
