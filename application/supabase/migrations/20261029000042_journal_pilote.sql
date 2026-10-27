-- Journal du pilote et reprise (Jalon 13, étape 2 ; ADR 0081).
--   - Chaque décision du propriétaire pendant le pilote est notée : suspension d'un agent, fermeture de l'accès des
--     élèves, reprise, point hebdomadaire, note.
--   - Une reprise (agent réactivé, accès rouvert) exige les 4 points de docs/pilote/criteres-arret.md : cause
--     identifiée, correction faite et testée, accord du propriétaire, établissement informé.
--   - Le critère d'arrêt « deux suspensions immédiates pour la même cause » se calcule désormais sur ce journal.
--   Textes libres : sans donnée personnelle (coordonnées masquées par le serveur) ; tout est aussi tracé dans le
--   journal d'audit.

create type type_decision_pilote as enum (
  'suspension_agent', 'reprise_agent', 'fermeture_acces', 'reprise_acces', 'point_hebdomadaire', 'note'
);

create table journal_pilote (
  id bigint generated always as identity primary key,
  type type_decision_pilote not null,
  agent text references etat_agents (agent),
  critere text check (critere is null or critere ~ '^[a-z_]{3,40}$'),
  texte text not null check (char_length(texte) between 3 and 500),
  cause text check (cause is null or char_length(cause) between 3 and 300),
  correction text check (correction is null or char_length(correction) between 3 and 300),
  cree_le timestamptz not null default now(),
  cree_par text not null,
  check ((type in ('suspension_agent', 'reprise_agent')) = (agent is not null)),
  check ((type in ('reprise_agent', 'reprise_acces')) = (cause is not null and correction is not null))
);
alter table journal_pilote enable row level security;
revoke all on journal_pilote from public, anon, authenticated;

-- « Deux suspensions immédiates pour la même cause » devient calculé : il ne se déclare plus.
delete from criteres_declares where critere = 'suspensions_repetees';
alter table criteres_declares drop constraint criteres_declares_critere_check;
alter table criteres_declares add constraint criteres_declares_critere_check check (critere in (
  'contenu_dangereux', 'fuite_donnees', 'contenu_non_valide_montre', 'demande_etablissement',
  'sortie_perimetre', 'equipe_indisponible', 'retrait_accord'));

create function controler_texte_pilote(p_texte text, p_nom text, p_max integer) returns text
language plpgsql immutable
set search_path = pg_catalog
as $$
begin
  if char_length(btrim(coalesce(p_texte, ''))) not between 3 and p_max then
    raise exception '% : 3 à % caractères.', p_nom, p_max using errcode = '22023';
  end if;
  return btrim(p_texte);
end;
$$;
revoke execute on function controler_texte_pilote(text, text, integer) from public, anon, authenticated;

create function controler_reprise(p_accord boolean, p_etablissement boolean) returns void
language plpgsql immutable
set search_path = pg_catalog
as $$
begin
  if not coalesce(p_accord, false) or not coalesce(p_etablissement, false) then
    raise exception 'Reprise refusée : l''accord du propriétaire et l''information de l''établissement sont exigés.'
      using errcode = '22023';
  end if;
end;
$$;
revoke execute on function controler_reprise(boolean, boolean) from public, anon, authenticated;

create function noter_decision_pilote(
  p_type type_decision_pilote, p_agent text, p_critere text, p_texte text, p_cause text, p_correction text,
  p_acteur_empreinte text
) returns void
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  insert into journal_pilote (type, agent, critere, texte, cause, correction, cree_par)
  values (p_type, p_agent, nullif(p_critere, ''), p_texte, p_cause, p_correction, coalesce(p_acteur_empreinte, ''));
  insert into journal_audit (acteur, acteur_empreinte, action, objet_type, details)
  values ('administrateur', p_acteur_empreinte, 'journal_pilote_' || p_type::text, 'pilote',
          jsonb_strip_nulls(jsonb_build_object('agent', p_agent, 'critere', nullif(p_critere, ''))));
end;
$$;
revoke execute on function noter_decision_pilote(type_decision_pilote, text, text, text, text, text, text)
  from public, anon, authenticated;

/** Suspend un agent (il ne répond plus à personne), avec un motif et, si besoin, le critère en cause. */
create function suspendre_agent_pilote(p_agent text, p_motif text, p_critere text, p_acteur_empreinte text)
returns void
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_motif text;
begin
  perform verifier_administrateur();
  v_motif := controler_texte_pilote(p_motif, 'Motif', 500);
  update etat_agents set suspendu = true, motif = left(v_motif, 200), maj_le = now()
  where agent = p_agent and not suspendu;
  if not found then
    raise exception 'Agent inconnu ou déjà suspendu.' using errcode = '22023';
  end if;
  perform noter_decision_pilote('suspension_agent', p_agent, p_critere, v_motif, null, null, p_acteur_empreinte);
end;
$$;
revoke execute on function suspendre_agent_pilote(text, text, text, text) from public, anon;
grant execute on function suspendre_agent_pilote(text, text, text, text) to authenticated;

/** Réactive un agent suspendu (par l'administration ou par l'Orchestrateur) : reprise avec les 4 points. */
create function reprendre_agent_pilote(
  p_agent text, p_cause text, p_correction text, p_accord boolean, p_etablissement boolean, p_acteur_empreinte text
) returns void
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_cause text;
  v_correction text;
begin
  perform verifier_administrateur();
  v_cause := controler_texte_pilote(p_cause, 'Cause identifiée', 300);
  v_correction := controler_texte_pilote(p_correction, 'Correction faite et testée', 300);
  perform controler_reprise(p_accord, p_etablissement);
  update etat_agents set suspendu = false, motif = null, maj_le = now() where agent = p_agent and suspendu;
  if not found then
    raise exception 'Agent inconnu ou déjà actif.' using errcode = '22023';
  end if;
  perform noter_decision_pilote('reprise_agent', p_agent, null, 'Reprise de l''agent ' || p_agent,
                                v_cause, v_correction, p_acteur_empreinte);
end;
$$;
revoke execute on function reprendre_agent_pilote(text, text, text, boolean, boolean, text) from public, anon;
grant execute on function reprendre_agent_pilote(text, text, text, boolean, boolean, text) to authenticated;

/** Ferme l'accès des élèves (message neutre ; « Mes données » reste accessible). */
create function fermer_acces_pilote(p_motif text, p_critere text, p_acteur_empreinte text) returns void
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_motif text;
begin
  perform verifier_administrateur();
  v_motif := controler_texte_pilote(p_motif, 'Motif', 500);
  update acces_eleves set ouvert = false, motif = v_motif, maj_le = now(), maj_par = auth.uid() where ouvert;
  if not found then
    raise exception 'L''accès des élèves est déjà fermé.' using errcode = '22023';
  end if;
  perform noter_decision_pilote('fermeture_acces', null, p_critere, v_motif, null, null, p_acteur_empreinte);
end;
$$;
revoke execute on function fermer_acces_pilote(text, text, text) from public, anon;
grant execute on function fermer_acces_pilote(text, text, text) to authenticated;

/** Rouvre l'accès des élèves : reprise avec les 4 points. */
create function rouvrir_acces_pilote(
  p_cause text, p_correction text, p_accord boolean, p_etablissement boolean, p_acteur_empreinte text
) returns void
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_cause text;
  v_correction text;
begin
  perform verifier_administrateur();
  v_cause := controler_texte_pilote(p_cause, 'Cause identifiée', 300);
  v_correction := controler_texte_pilote(p_correction, 'Correction faite et testée', 300);
  perform controler_reprise(p_accord, p_etablissement);
  update acces_eleves set ouvert = true, motif = null, maj_le = now(), maj_par = auth.uid() where not ouvert;
  if not found then
    raise exception 'L''accès des élèves est déjà ouvert.' using errcode = '22023';
  end if;
  perform noter_decision_pilote('reprise_acces', null, null, 'Réouverture de l''accès des élèves',
                                v_cause, v_correction, p_acteur_empreinte);
end;
$$;
revoke execute on function rouvrir_acces_pilote(text, text, boolean, boolean, text) from public, anon;
grant execute on function rouvrir_acces_pilote(text, text, boolean, boolean, text) to authenticated;

/** Point hebdomadaire ou note libre, avec le critère concerné si besoin. */
create function noter_journal_pilote(p_type text, p_texte text, p_critere text, p_acteur_empreinte text)
returns void
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  perform verifier_administrateur();
  if p_type not in ('point_hebdomadaire', 'note') then
    raise exception 'Type d''entrée inconnu.' using errcode = '22023';
  end if;
  perform noter_decision_pilote(p_type::type_decision_pilote, null, p_critere,
                                controler_texte_pilote(p_texte, 'Texte', 500), null, null, p_acteur_empreinte);
end;
$$;
revoke execute on function noter_journal_pilote(text, text, text, text) from public, anon;
grant execute on function noter_journal_pilote(text, text, text, text) to authenticated;

create function journal_pilote_liste(p_limite integer default 100) returns table (
  id bigint, type text, agent text, critere text, texte text, cause text, correction text, cree_le timestamptz
)
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
begin
  perform verifier_administrateur();
  return query
    select j.id, j.type::text, j.agent, j.critere, j.texte, j.cause, j.correction, j.cree_le
    from journal_pilote j order by j.cree_le desc, j.id desc limit least(greatest(coalesce(p_limite, 100), 1), 500);
end;
$$;
revoke execute on function journal_pilote_liste(integer) from public, anon;
grant execute on function journal_pilote_liste(integer) to authenticated;

-- Faits du suivi : ajout du plus grand nombre de suspensions (agent ou accès) pour un même critère.
drop function faits_criteres_pilote(integer, integer, integer);
drop function faits_criteres_orchestrateur(integer, integer, integer);
drop function faits_criteres_interne(integer, integer, integer);

create function faits_criteres_interne(p_delai_heures integer, p_delai_max_heures integer, p_erreur_jours integer)
returns table (
  detresses_hors_delai integer, detresses_hors_delai_max integer, erreurs_contenu_anciennes integer,
  contestations_max_question integer, cout_7_jours numeric, agents_suspendus text[], acces_eleves_ouvert boolean,
  suspensions_meme_cause_max integer
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
    coalesce((select ouvert from acces_eleves), true),
    coalesce((select max(n)::integer from (
       select count(*) as n from journal_pilote
       where type in ('suspension_agent', 'fermeture_acces') and critere is not null group by critere) y), 0)
$$;
revoke execute on function faits_criteres_interne(integer, integer, integer) from public, anon, authenticated;

create function faits_criteres_pilote(p_delai_heures integer, p_delai_max_heures integer, p_erreur_jours integer)
returns table (
  detresses_hors_delai integer, detresses_hors_delai_max integer, erreurs_contenu_anciennes integer,
  contestations_max_question integer, cout_7_jours numeric, agents_suspendus text[], acces_eleves_ouvert boolean,
  suspensions_meme_cause_max integer
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

create function faits_criteres_orchestrateur(p_delai_heures integer, p_delai_max_heures integer, p_erreur_jours integer)
returns table (
  detresses_hors_delai integer, detresses_hors_delai_max integer, erreurs_contenu_anciennes integer,
  contestations_max_question integer, cout_7_jours numeric, agents_suspendus text[], acces_eleves_ouvert boolean,
  suspensions_meme_cause_max integer
)
language sql stable security definer
set search_path = pg_catalog, public
as $$ select * from faits_criteres_interne(p_delai_heures, p_delai_max_heures, p_erreur_jours) $$;
revoke execute on function faits_criteres_orchestrateur(integer, integer, integer) from public, anon, authenticated;
grant execute on function faits_criteres_orchestrateur(integer, integer, integer) to agent_orchestrateur;
