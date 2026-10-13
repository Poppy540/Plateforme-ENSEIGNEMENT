-- Jalon 4, étape 0 : alerte de veille et quota de l'assistant d'aide en base (ADR 0036).

-- ---------------------------------------------------------------------------------------------------------
-- Alertes de veille : tout signalement ou ticket de priorité 1 (la détresse l'est toujours) est inscrit ici
-- par la base elle-même, quel que soit l'agent qui l'a créé. Le service de messagerie prévient l'équipe de
-- veille (message sans donnée d'élève), puis relance tant que l'élément n'est ni traité ni pris en charge.
-- ---------------------------------------------------------------------------------------------------------
create table alertes_veille (
  id uuid primary key default gen_random_uuid(),
  objet_type text not null check (objet_type in ('signalement', 'ticket')),
  objet_id uuid not null,
  motif text not null,
  cree_le timestamptz not null default now(),
  envois smallint not null default 0,
  dernier_envoi_le timestamptz,
  unique (objet_type, objet_id)
);
alter table alertes_veille enable row level security;
revoke all on alertes_veille from public, anon, authenticated;

create function inscrire_alerte_veille() returns trigger
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  if new.priorite = 1 then
    insert into alertes_veille (objet_type, objet_id, motif)
    values (tg_argv[0], new.id,
            to_jsonb(new) ->> case when tg_argv[0] = 'ticket' then 'categorie' else 'motif' end)
    on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger signalements_alerte_veille after insert on signalements
  for each row execute function inscrire_alerte_veille('signalement');
create trigger tickets_alerte_veille after insert on tickets_support
  for each row execute function inscrire_alerte_veille('ticket');

/**
 * Alertes à envoyer maintenant : jamais envoyées, ou à relancer (élément toujours ouvert, dernier envoi plus
 * ancien que p_relance_minutes, au plus p_relances_max relances). Les marque envoyées et les renvoie.
 */
create function alertes_veille_a_envoyer(p_relance_minutes integer, p_relances_max integer)
returns table (id uuid, objet_type text, motif text, cree_le timestamptz, envois smallint)
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  return query
  update alertes_veille a set envois = a.envois + 1, dernier_envoi_le = now()
  where a.id in (
    select x.id from alertes_veille x
    where (
        (x.objet_type = 'signalement' and exists (
          select 1 from signalements s where s.id = x.objet_id and s.traite_le is null))
        or (x.objet_type = 'ticket' and exists (
          select 1 from tickets_support t where t.id = x.objet_id and t.statut = 'ouvert'))
      )
      and (x.envois = 0 or (x.envois <= p_relances_max
           and x.dernier_envoi_le < now() - make_interval(mins => greatest(p_relance_minutes, 1))))
    for update skip locked
  )
  returning a.id, a.objet_type, a.motif, a.cree_le, a.envois;
end;
$$;
revoke execute on function alertes_veille_a_envoyer(integer, integer), inscrire_alerte_veille()
  from public, anon, authenticated;
grant execute on function alertes_veille_a_envoyer(integer, integer) to service_messagerie;

-- ---------------------------------------------------------------------------------------------------------
-- Quota quotidien de l'assistant d'aide, par personne (jusqu'ici en mémoire du serveur). Seul l'agent Support
-- le consomme, pour la personne fixée par le serveur ; les jours passés sont effacés au passage.
-- ---------------------------------------------------------------------------------------------------------
create table quotas_support (
  utilisateur_id uuid not null,
  jour date not null default current_date,
  questions integer not null default 0,
  primary key (utilisateur_id, jour)
);
alter table quotas_support enable row level security;
revoke all on quotas_support from public, anon, authenticated;

create function prendre_quota_support(p_max integer) returns boolean
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_utilisateur uuid := contexte_agent('eleve_id');
  v_n integer;
begin
  if v_utilisateur is null then
    raise exception 'Personne non fixée.' using errcode = '42501';
  end if;
  delete from quotas_support where jour < current_date - 1;
  insert into quotas_support (utilisateur_id) values (v_utilisateur)
  on conflict (utilisateur_id, jour) do nothing;
  update quotas_support set questions = questions + 1
  where utilisateur_id = v_utilisateur and jour = current_date and questions < p_max
  returning questions into v_n;
  return v_n is not null;
end;
$$;
revoke execute on function prendre_quota_support(integer) from public, anon, authenticated;
grant execute on function prendre_quota_support(integer) to agent_support;
