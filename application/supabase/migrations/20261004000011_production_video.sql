-- Jalon 2, étape 5 : chaîne de production vidéo (ADR 0020, 0025).
-- La chaîne (rôle agent_production_video) vérifie le script validé, consigne chaque production et son coût,
-- ne peut utiliser la voix ou le visage d'une personne réelle qu'avec une autorisation enregistrée et active.

-- Autorisations écrites, séparées et révocables d'utiliser la voix ou le visage d'une personne réelle
-- (cadrage §5.1). Enregistrées par l'administration seulement ; la chaîne ne fait que les lire.
create table autorisations_image_voix (
  id uuid primary key default gen_random_uuid(),
  personne text not null check (char_length(personne) between 1 and 200),
  usage text not null check (usage in ('voix', 'visage')),
  document_reference text not null check (char_length(document_reference) between 1 and 500),
  accordee_le date not null,
  revoquee_le timestamptz,
  enregistree_le timestamptz not null default now()
);
alter table autorisations_image_voix enable row level security;
revoke all on autorisations_image_voix from anon, authenticated, agent_professeur, agent_scenariste,
  agent_production_video, agent_evaluateur;

/** Vrai si l'autorisation existe, porte sur cet usage et n'est pas révoquée. */
create function autorisation_active(p_autorisation uuid, p_usage text) returns boolean
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from autorisations_image_voix
    where id = p_autorisation and usage = p_usage and revoquee_le is null
  )
$$;
revoke execute on function autorisation_active(uuid, text) from public, anon, authenticated;
grant execute on function autorisation_active(uuid, text) to agent_production_video;

/**
 * État d'un script pour la production : statut, version et empreinte enregistrées, empreinte recalculée
 * sur le contenu actuel, et version/empreinte de la dernière validation tracée. La chaîne compare tout.
 */
create function script_pour_production(p_script uuid)
returns table (
  statut text, version integer, empreinte text, empreinte_recalculee text,
  version_validee integer, empreinte_validee text, chapitre_id uuid, contenu jsonb, duree_cible_minutes smallint
)
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select s.statut::text, s.version, s.empreinte, empreinte_jsonb(s.contenu),
    a.version, a.empreinte, s.chapitre_id, s.contenu, s.duree_cible_minutes
  from scripts s
  left join lateral (
    select version, empreinte from approbations
    where objet_type = 'script' and objet_id = s.id and decision = 'valide'
    order by decide_le desc limit 1
  ) a on true
  where s.id = p_script
$$;
revoke execute on function script_pour_production(uuid) from public, anon, authenticated;
grant execute on function script_pour_production(uuid) to agent_production_video;

-- Journal de chaque production, déposée ou arrêtée, avec son coût (prompt C2 : « consigner l'opération et son coût »).
create table journal_production_video (
  id uuid primary key default gen_random_uuid(),
  script_id uuid not null references scripts (id) on delete restrict,
  script_version integer not null,
  resultat text not null check (resultat in ('deposee', 'arretee', 'refusee')),
  video_id uuid references videos (id) on delete set null,
  cout_usd numeric(10, 4) not null check (cout_usd >= 0),
  rapport jsonb not null,
  cree_le timestamptz not null default now()
);
create index on journal_production_video (script_id, cree_le);
alter table journal_production_video enable row level security;
revoke all on journal_production_video from anon, authenticated, agent_professeur, agent_scenariste,
  agent_production_video, agent_evaluateur;
grant select, insert (script_id, script_version, resultat, video_id, cout_usd, rapport)
  on journal_production_video to agent_production_video;
create policy journal_production on journal_production_video for select to agent_production_video using (true);
create policy journal_production_insertion on journal_production_video for insert to agent_production_video
  with check (true);
grant select on journal_production_video to authenticated;
create policy journal_referents on journal_production_video for select to authenticated
  using (exists (select 1 from scripts s where s.id = script_id and est_referent_du_chapitre(s.chapitre_id)));

-- Alertes de la chaîne pour un humain (budget, échecs répétés, fidélité, droits d'une voix ou d'une image).
grant insert on signalements to agent_production_video;
create policy signalements_production on signalements for insert to agent_production_video
  with check (source = 'agent_production_video' and traite_le is null and eleve_id is null);
