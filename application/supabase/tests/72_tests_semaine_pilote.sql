-- Rapport hebdomadaire du pilote (Jalon 13, étape 3 ; ADR 0082). Après 71 : administrateur 5555…, référent 3333….
-- Signalements FICTIFS datés dans la semaine et dans la précédente, supprimés à la fin.
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

create function pg_temp.connecter(p_utilisateur text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_utilisateur, false)
$$;

create temporary table avant as
  select s.periode, s.signalements, s.detresses, s.erreurs_contenu, s.signalements_traites, s.cout_usd
  from (select pg_temp.connecter('55555555-5555-4555-8555-555555555555')) c,
       lateral (select * from semaine_pilote(current_date)) s;
grant select on avant to authenticated;
reset role;

insert into signalements (source, motif, priorite, resume, cree_le, traite_le) values
  ('agent_professeur', 'detresse', 1, 'Semaine fictive : détresse', now() - interval '1 day', now() - interval '20 hours'),
  ('agent_professeur', 'erreur_contenu', 2, 'Semaine fictive : erreur', now() - interval '2 days', null),
  ('agent_professeur', 'hors_programme', 2, 'Semaine fictive : précédente', now() - interval '9 days', null);
insert into consommation_agents (agent, jour, cout_usd) values ('evaluateur', current_date - 2, 4.5)
  on conflict (agent, jour) do update set cout_usd = consommation_agents.cout_usd + 4.5;

-- SP01 Administration seulement ; fin invalide refusée.
select pg_temp.connecter('33333333-3333-3333-3333-333333333333');
set role authenticated;
do $$ begin
  begin perform semaine_pilote(current_date); raise exception 'SP01 : référent lit la semaine';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set role anon;
do $$ begin
  begin perform semaine_pilote(current_date); raise exception 'SP01 : visiteur';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- SP02 Deux périodes de 7 jours, la semaine d'abord ; chiffres de la semaine et de la précédente séparés.
select pg_temp.connecter('55555555-5555-4555-8555-555555555555');
set role authenticated;
do $$ declare s record; p record; a record; b record; begin
  begin perform semaine_pilote(current_date + 30); raise exception 'SP02 : fin dans le futur';
  exception when invalid_parameter_value then null; end;
  assert (select count(*) from semaine_pilote(current_date)) = 2, 'SP02 : deux périodes';
  select * into s from semaine_pilote(current_date) where periode = 'semaine';
  select * into p from semaine_pilote(current_date) where periode = 'precedente';
  assert s.debut = current_date - 6 and s.fin = current_date, 'SP02 : bornes de la semaine';
  assert p.debut = current_date - 13 and p.fin = current_date - 7, 'SP02 : bornes de la précédente';
  select * into a from avant where periode = 'semaine';
  select * into b from avant where periode = 'precedente';
  assert s.signalements = a.signalements + 2, 'SP02 : deux signalements dans la semaine';
  assert s.detresses = a.detresses + 1, 'SP02 : une détresse';
  assert s.erreurs_contenu = a.erreurs_contenu + 1, 'SP02 : une erreur de contenu';
  assert s.signalements_traites = a.signalements_traites + 1, 'SP02 : un signalement traité';
  assert s.cout_usd = a.cout_usd + 4.5, 'SP02 : coût de la semaine';
  assert p.signalements = b.signalements + 1, 'SP02 : un signalement la semaine précédente';
  assert s.delai_median_heures is not null, 'SP02 : délai médian';
end $$;
reset role;

delete from signalements where resume like 'Semaine fictive : %';
update consommation_agents set cout_usd = cout_usd - 4.5 where agent = 'evaluateur' and jour = current_date - 2;

\o
\echo 'OK SP01 semaine du pilote réservée à l''administration'
\echo 'OK SP02 semaine et semaine précédente, en nombres, sans donnée individuelle'
