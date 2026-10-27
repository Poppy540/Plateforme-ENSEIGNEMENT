-- Critères de suspension du pilote surveillés (Jalon 13, étape 1 ; ADR 0080).
--   - Les faits visibles en base sont calculés, en nombres seulement (aucune donnée d'élève) ; les seuils viennent
--     du pack pays et sont passés par le serveur.
--   - Les autres critères sont déclarés par le propriétaire avec un motif, puis levés ; tracé dans le journal d'audit.
--   - L'exécuteur planifié (Orchestrateur) ajoute une seule alerte par épisode dans la file humaine.
--   La plateforme signale, le propriétaire décide : rien ici ne suspend quoi que ce soit.

create table criteres_declares (
  critere text primary key check (critere in (
    'contenu_dangereux', 'fuite_donnees', 'contenu_non_valide_montre', 'demande_etablissement',
    'sortie_perimetre', 'equipe_indisponible', 'retrait_accord', 'suspensions_repetees')),
  motif text not null check (char_length(motif) between 3 and 300),
  declare_le timestamptz not null default now(),
  declare_par text not null
);
alter table criteres_declares enable row level security;
revoke all on criteres_declares from public, anon, authenticated;

-- Épisodes déjà signalés dans la file humaine (un critère : une alerte, jusqu'à ce qu'il redevienne calme).
create table alertes_criteres (
  critere text primary key check (critere ~ '^[a-z_]{3,40}$'),
  alerte_le timestamptz not null default now()
);
alter table alertes_criteres enable row level security;
revoke all on alertes_criteres from public, anon, authenticated;

/** Pays des chapitres du pilote (leurs packs portent les seuils). */
create function pays_du_pilote_interne() returns setof text
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select distinct r.pays_code from chapitres_pilote cp
  join chapitres c on c.id = cp.chapitre_id join unites u on u.id = c.unite_id
  join referentiels r on r.id = u.referentiel_id
  order by 1
$$;
revoke execute on function pays_du_pilote_interne() from public, anon, authenticated;

/**
 * Faits du suivi, en nombres : détresses ouvertes au-delà des deux délais, erreurs de contenu ouvertes au-delà du
 * délai, contestations sur une même question en 7 jours (maximum), coût des 7 derniers jours, agents suspendus,
 * accès des élèves. Un délai nul (non fixé) donne null.
 */
create function faits_criteres_interne(p_delai_heures integer, p_delai_max_heures integer, p_erreur_jours integer)
returns table (
  detresses_hors_delai integer, detresses_hors_delai_max integer, erreurs_contenu_anciennes integer,
  contestations_max_question integer, cout_7_jours numeric, agents_suspendus text[], acces_eleves_ouvert boolean
)
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select
    case when p_delai_heures is null then null else
      (select count(*)::integer from signalements where motif = 'detresse' and traite_le is null
       and cree_le < now() - make_interval(hours => p_delai_heures)) end,
    case when p_delai_max_heures is null then null else
      (select count(*)::integer from signalements where motif = 'detresse' and traite_le is null
       and cree_le < now() - make_interval(hours => p_delai_max_heures)) end,
    case when p_erreur_jours is null then null else
      (select count(*)::integer from signalements where motif = 'erreur_contenu' and traite_le is null
       and cree_le < now() - make_interval(days => p_erreur_jours)) end,
    coalesce((select max(n)::integer from (
       select count(*) as n from contestations_quiz cq join tentatives_quiz t on t.id = cq.tentative_id
       where cq.cree_le > now() - interval '7 days' group by t.quiz_id, cq.question) x), 0),
    coalesce((select sum(cout_usd) from consommation_agents where jour > current_date - 7), 0),
    coalesce((select array_agg(agent order by agent) from etat_agents where suspendu), '{}'),
    coalesce((select ouvert from acces_eleves), true)
$$;
revoke execute on function faits_criteres_interne(integer, integer, integer) from public, anon, authenticated;

-- Entrées de l'administration.
create function pays_du_pilote() returns setof text
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
begin
  perform verifier_administrateur();
  return query select * from pays_du_pilote_interne();
end;
$$;
revoke execute on function pays_du_pilote() from public, anon;
grant execute on function pays_du_pilote() to authenticated;

create function faits_criteres_pilote(p_delai_heures integer, p_delai_max_heures integer, p_erreur_jours integer)
returns table (
  detresses_hors_delai integer, detresses_hors_delai_max integer, erreurs_contenu_anciennes integer,
  contestations_max_question integer, cout_7_jours numeric, agents_suspendus text[], acces_eleves_ouvert boolean
)
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
begin
  perform verifier_administrateur();
  return query select * from faits_criteres_interne(p_delai_heures, p_delai_max_heures, p_erreur_jours);
end;
$$;
revoke execute on function faits_criteres_pilote(integer, integer, integer) from public, anon;
grant execute on function faits_criteres_pilote(integer, integer, integer) to authenticated;

create function criteres_declares_liste() returns table (critere text, motif text, declare_le timestamptz)
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
begin
  perform verifier_administrateur();
  return query select d.critere, d.motif, d.declare_le from criteres_declares d order by d.declare_le;
end;
$$;
revoke execute on function criteres_declares_liste() from public, anon;
grant execute on function criteres_declares_liste() to authenticated;

/** Déclare un critère (ou met à jour son motif). Tracé. */
create function declarer_critere(p_critere text, p_motif text, p_acteur_empreinte text) returns void
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  perform verifier_administrateur();
  if char_length(btrim(coalesce(p_motif, ''))) not between 3 and 300 then
    raise exception 'Motif de 3 à 300 caractères.' using errcode = '22023';
  end if;
  begin
    insert into criteres_declares (critere, motif, declare_par)
    values (p_critere, btrim(p_motif), coalesce(p_acteur_empreinte, ''))
    on conflict (critere) do update set motif = excluded.motif, declare_le = now(), declare_par = excluded.declare_par;
  exception when check_violation then
    raise exception 'Critère inconnu ou calculé par la plateforme.' using errcode = '22023';
  end;
  insert into journal_audit (acteur, acteur_empreinte, action, details)
  values ('administrateur', p_acteur_empreinte, 'critere_pilote_declare', jsonb_build_object('critere', p_critere));
end;
$$;
revoke execute on function declarer_critere(text, text, text) from public, anon;
grant execute on function declarer_critere(text, text, text) to authenticated;

/** Lève un critère déclaré, avec un motif. Tracé. */
create function lever_critere(p_critere text, p_motif text, p_acteur_empreinte text) returns boolean
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_n integer;
begin
  perform verifier_administrateur();
  if char_length(btrim(coalesce(p_motif, ''))) not between 3 and 300 then
    raise exception 'Motif de 3 à 300 caractères.' using errcode = '22023';
  end if;
  delete from criteres_declares where critere = p_critere;
  get diagnostics v_n = row_count;
  if v_n > 0 then
    insert into journal_audit (acteur, acteur_empreinte, action, details)
    values ('administrateur', p_acteur_empreinte, 'critere_pilote_leve',
            jsonb_build_object('critere', p_critere, 'motif', btrim(p_motif)));
  end if;
  return v_n > 0;
end;
$$;
revoke execute on function lever_critere(text, text, text) from public, anon;
grant execute on function lever_critere(text, text, text) to authenticated;

-- Entrées de l'Orchestrateur (exécuteur planifié) : mêmes faits, puis alertes.
create function pays_du_pilote_orchestrateur() returns setof text
language sql stable security definer
set search_path = pg_catalog, public
as $$ select * from pays_du_pilote_interne() $$;
revoke execute on function pays_du_pilote_orchestrateur() from public, anon, authenticated;
grant execute on function pays_du_pilote_orchestrateur() to agent_orchestrateur;

create function faits_criteres_orchestrateur(p_delai_heures integer, p_delai_max_heures integer, p_erreur_jours integer)
returns table (
  detresses_hors_delai integer, detresses_hors_delai_max integer, erreurs_contenu_anciennes integer,
  contestations_max_question integer, cout_7_jours numeric, agents_suspendus text[], acces_eleves_ouvert boolean
)
language sql stable security definer
set search_path = pg_catalog, public
as $$ select * from faits_criteres_interne(p_delai_heures, p_delai_max_heures, p_erreur_jours) $$;
revoke execute on function faits_criteres_orchestrateur(integer, integer, integer) from public, anon, authenticated;
grant execute on function faits_criteres_orchestrateur(integer, integer, integer) to agent_orchestrateur;

/**
 * Alertes des critères calculés qui ne sont pas calmes : p_actifs = [{critere, priorite (1 ou 2), resume}].
 * Une alerte par épisode dans la file humaine (sans élève) ; un critère redevenu calme est oublié, pour qu'un
 * nouvel épisode soit de nouveau signalé. Renvoie le nombre d'alertes ajoutées, par priorité.
 */
create function alerter_criteres_pilote(p_actifs jsonb) returns table (priorite integer, nombre integer)
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_element jsonb;
  v_critere text;
  v_priorite integer;
  v_resume text;
  v_comptes integer[] := array[0, 0];
begin
  if jsonb_typeof(coalesce(p_actifs, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_actifs, '[]')) > 30 then
    raise exception 'Liste de critères invalide.' using errcode = '22023';
  end if;
  delete from alertes_criteres a
  where not exists (select 1 from jsonb_array_elements(coalesce(p_actifs, '[]')) e where e->>'critere' = a.critere);
  for v_element in select * from jsonb_array_elements(coalesce(p_actifs, '[]')) loop
    v_critere := v_element->>'critere';
    v_priorite := (v_element->>'priorite')::integer;
    v_resume := left(coalesce(v_element->>'resume', ''), 300);
    if v_priorite not in (1, 2) or v_critere !~ '^[a-z_]{3,40}$' then
      raise exception 'Critère invalide.' using errcode = '22023';
    end if;
    insert into alertes_criteres (critere) values (v_critere) on conflict do nothing;
    if found then
      insert into signalements (source, motif, priorite, resume)
      values ('agent_orchestrateur', 'autre', v_priorite, 'Critère de suspension du pilote : ' || v_resume);
      v_comptes[v_priorite] := v_comptes[v_priorite] + 1;
    end if;
  end loop;
  return query select 1, v_comptes[1] union all select 2, v_comptes[2];
end;
$$;
revoke execute on function alerter_criteres_pilote(jsonb) from public, anon, authenticated;
grant execute on function alerter_criteres_pilote(jsonb) to agent_orchestrateur;
