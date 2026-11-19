-- Rapport hebdomadaire agrégé du pilote (Jalon 13, étape 3 ; ADR 0082).
-- Chiffres de la semaine qui finit le jour donné (7 jours, fin incluse) et de la précédente, en nombres seulement :
-- aucune donnée individuelle. Le masquage des petits effectifs (moins de 5) est fait à l'affichage, comme pour les
-- indicateurs quotidiens (ADR 0046). Administration seulement.

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
  with periodes as (
    select 'semaine'::text as nom, p_fin - 6 as d, p_fin as f
    union all select 'precedente', p_fin - 13, p_fin - 7
  ), bornes as (
    select nom, d, f, d::timestamptz as t0, (f + 1)::timestamptz as t1 from periodes
  )
  select b.nom, b.d, b.f,
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
  from bornes b
  order by b.d desc;
end;
$$;
revoke execute on function semaine_pilote(date) from public, anon;
grant execute on function semaine_pilote(date) to authenticated;
