-- Fin du pilote : période et rapport de fin (Jalon 14, étape 1 ; ADR 0084).
--   - La période du pilote (début, fin) est saisie dans l'administration et tracée.
--   - Les chiffres d'une période quelconque (une semaine, ou tout le pilote) sont calculés par une seule fonction
--     interne, reprise de semaine_pilote (ADR 0082), qui devient un simple appel à cette fonction.
--   - Les alertes de critères de suspension de la période sont relues dans la file humaine (résumés sans élève).

create table periode_pilote (
  id boolean primary key default true check (id),
  debut date not null,
  fin date,
  maj_le timestamptz not null default now(),
  maj_par text not null,
  check (fin is null or fin >= debut),
  check (fin is null or fin - debut <= 366)
);
alter table periode_pilote enable row level security;
revoke all on periode_pilote from public, anon, authenticated;

/** Chiffres agrégés d'une période (journées entières, fin incluse). Sans droit d'exécution direct. */
create function chiffres_periode_interne(p_debut date, p_fin date) returns table (
  debut date, fin date,
  eleves_inscrits integer, eleves_actifs integer, chapitres_termines integer,
  videos_demarrees integer, videos_terminees integer, lecons_ouvertes integer,
  questions integer, quiz integer, score_moyen numeric, contestations integer, reponses_questionnaire integer,
  signalements integer, detresses integer, hors_programme integer, contenus_inappropries integer,
  erreurs_contenu integer, demandes_reponses integer,
  signalements_traites integer, signalements_ouverts integer, delai_median_heures numeric,
  tickets integer, tickets_resolus integer, chapitres_valides integer, cout_usd numeric
)
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
begin
  return query
  with bornes as (
    select p_debut as d, p_fin as f, p_debut::timestamptz as t0, (p_fin + 1)::timestamptz as t1
  )
  select p_debut, p_fin,
    (select count(*)::int from eleves e join profils p on p.id = e.id where e.statut = 'actif' and p.cree_le < b.t1),
    (select count(distinct x.eleve_id)::int from (
       select e.eleve_id from echanges_professeur e where e.auteur = 'eleve' and e.cree_le >= b.t0 and e.cree_le < b.t1
       union select t.eleve_id from tentatives_quiz t where t.corrige_le >= b.t0 and t.corrige_le < b.t1) x),
    (select count(*)::int from progression pr where pr.statut = 'termine' and pr.maj_le >= b.t0 and pr.maj_le < b.t1),
    (select coalesce(sum(v.videos_demarrees), 0)::int from visionnages_jour v where v.jour between b.d and b.f),
    (select coalesce(sum(v.videos_terminees), 0)::int from visionnages_jour v where v.jour between b.d and b.f),
    (select coalesce(sum(v.lecons_ouvertes), 0)::int from visionnages_jour v where v.jour between b.d and b.f),
    (select count(*)::int from echanges_professeur e where e.auteur = 'eleve' and e.cree_le >= b.t0 and e.cree_le < b.t1),
    (select count(*)::int from tentatives_quiz t where t.corrige_le >= b.t0 and t.corrige_le < b.t1),
    (select round(avg(t.score), 1) from tentatives_quiz t where t.corrige_le >= b.t0 and t.corrige_le < b.t1),
    (select count(*)::int from contestations_quiz c where c.cree_le >= b.t0 and c.cree_le < b.t1),
    -- Les réponses ne portent que leur semaine (lundi), jamais leur jour : semaines qui touchent la période.
    (select count(*)::int from reponses_questionnaire r
     where r.semaine between date_trunc('week', b.d)::date and b.f),
    (select count(*)::int from signalements s where s.cree_le >= b.t0 and s.cree_le < b.t1),
    (select count(*)::int from signalements s where s.motif = 'detresse' and s.cree_le >= b.t0 and s.cree_le < b.t1),
    (select count(*)::int from signalements s where s.motif = 'hors_programme' and s.cree_le >= b.t0 and s.cree_le < b.t1),
    (select count(*)::int from signalements s where s.motif = 'contenu_inapproprie' and s.cree_le >= b.t0 and s.cree_le < b.t1),
    (select count(*)::int from signalements s where s.motif = 'erreur_contenu' and s.cree_le >= b.t0 and s.cree_le < b.t1),
    (select count(*)::int from signalements s where s.motif = 'demande_reponses' and s.cree_le >= b.t0 and s.cree_le < b.t1),
    (select count(*)::int from signalements s where s.traite_le >= b.t0 and s.traite_le < b.t1),
    (select count(*)::int from signalements s where s.cree_le < b.t1 and (s.traite_le is null or s.traite_le >= b.t1)),
    (select round((percentile_cont(0.5) within group (order by extract(epoch from s.traite_le - s.cree_le)) / 3600)::numeric, 1)
     from signalements s where s.traite_le >= b.t0 and s.traite_le < b.t1),
    (select count(*)::int from tickets_support t where t.cree_le >= b.t0 and t.cree_le < b.t1),
    (select count(*)::int from tickets_support t where t.statut = 'resolu' and t.traite_le >= b.t0 and t.traite_le < b.t1),
    (select count(*)::int from approbations a where a.objet_type = 'chapitre' and a.decision = 'valide'
     and a.decide_le >= b.t0 and a.decide_le < b.t1),
    (select coalesce(sum(c.cout_usd), 0) from consommation_agents c where c.jour between b.d and b.f)
  from bornes b;
end;
$$;
revoke execute on function chiffres_periode_interne(date, date) from public, anon, authenticated;

-- Le rapport hebdomadaire passe par la même fonction (mêmes colonnes, même ordre : semaine puis précédente).
drop function semaine_pilote(date);
create function semaine_pilote(p_fin date) returns table (
  periode text, debut date, fin date,
  eleves_inscrits integer, eleves_actifs integer, chapitres_termines integer,
  videos_demarrees integer, videos_terminees integer, lecons_ouvertes integer,
  questions integer, quiz integer, score_moyen numeric, contestations integer, reponses_questionnaire integer,
  signalements integer, detresses integer, hors_programme integer, contenus_inappropries integer,
  erreurs_contenu integer, demandes_reponses integer,
  signalements_traites integer, signalements_ouverts integer, delai_median_heures numeric,
  tickets integer, tickets_resolus integer, chapitres_valides integer, cout_usd numeric
)
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
begin
  perform verifier_administrateur();
  if p_fin is null or p_fin > current_date + 1 or p_fin < date '2020-01-01' then
    raise exception 'Fin de semaine invalide.' using errcode = '22023';
  end if;
  return query
    select 'semaine'::text, c.* from chiffres_periode_interne(p_fin - 6, p_fin) c
    union all
    select 'precedente'::text, c.* from chiffres_periode_interne(p_fin - 13, p_fin - 7) c;
end;
$$;
revoke execute on function semaine_pilote(date) from public, anon;
grant execute on function semaine_pilote(date) to authenticated;

/** Chiffres d'une période (366 jours au plus). Administration seulement. */
create function chiffres_periode(p_debut date, p_fin date) returns table (
  debut date, fin date,
  eleves_inscrits integer, eleves_actifs integer, chapitres_termines integer,
  videos_demarrees integer, videos_terminees integer, lecons_ouvertes integer,
  questions integer, quiz integer, score_moyen numeric, contestations integer, reponses_questionnaire integer,
  signalements integer, detresses integer, hors_programme integer, contenus_inappropries integer,
  erreurs_contenu integer, demandes_reponses integer,
  signalements_traites integer, signalements_ouverts integer, delai_median_heures numeric,
  tickets integer, tickets_resolus integer, chapitres_valides integer, cout_usd numeric
)
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
begin
  perform verifier_administrateur();
  if p_debut is null or p_fin is null or p_fin < p_debut or p_fin - p_debut > 366 or p_debut < date '2020-01-01' then
    raise exception 'Période invalide.' using errcode = '22023';
  end if;
  return query select * from chiffres_periode_interne(p_debut, p_fin);
end;
$$;
revoke execute on function chiffres_periode(date, date) from public, anon;
grant execute on function chiffres_periode(date, date) to authenticated;

/** Période du pilote (aucune ligne tant qu'elle n'est pas saisie). */
create function periode_pilote_lire() returns table (debut date, fin date, maj_le timestamptz)
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
begin
  perform verifier_administrateur();
  return query select p.debut, p.fin, p.maj_le from periode_pilote p;
end;
$$;
revoke execute on function periode_pilote_lire() from public, anon;
grant execute on function periode_pilote_lire() to authenticated;

/** Saisit ou corrige la période du pilote (fin vide : pilote en cours). Tracé. */
create function definir_periode_pilote(p_debut date, p_fin date, p_acteur_empreinte text) returns void
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  perform verifier_administrateur();
  if p_debut is null or p_debut < date '2020-01-01' then
    raise exception 'Date de début invalide.' using errcode = '22023';
  end if;
  if p_fin is not null and (p_fin < p_debut or p_fin - p_debut > 366) then
    raise exception 'La fin doit suivre le début, sur un an au plus.' using errcode = '22023';
  end if;
  insert into periode_pilote (id, debut, fin, maj_par) values (true, p_debut, p_fin, coalesce(p_acteur_empreinte, ''))
  on conflict (id) do update set debut = excluded.debut, fin = excluded.fin, maj_le = now(), maj_par = excluded.maj_par;
  insert into journal_audit (acteur, acteur_empreinte, action, objet_type, details)
  values ('administrateur', p_acteur_empreinte, 'periode_pilote', 'pilote',
          jsonb_build_object('debut', p_debut, 'fin', p_fin));
end;
$$;
revoke execute on function definir_periode_pilote(date, date, text) from public, anon;
grant execute on function definir_periode_pilote(date, date, text) to authenticated;

/** Alertes de critères de suspension levées pendant la période (résumés de l'Orchestrateur, jamais d'élève). */
create function alertes_criteres_periode(p_debut date, p_fin date)
returns table (cree_le timestamptz, priorite smallint, resume text)
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
begin
  perform verifier_administrateur();
  return query
    select s.cree_le, s.priorite, s.resume from signalements s
    where s.source = 'agent_orchestrateur' and s.eleve_id is null
      and s.resume like 'Critère de suspension du pilote : %'
      and s.cree_le >= p_debut::timestamptz and s.cree_le < (p_fin + 1)::timestamptz
    order by s.cree_le;
end;
$$;
revoke execute on function alertes_criteres_periode(date, date) from public, anon;
grant execute on function alertes_criteres_periode(date, date) to authenticated;
