-- Sort des données en fin de pilote, SIMULATION (Jalon 14, étape 3 ; ADR 0086). Après 74 : administrateur 5555…,
-- référent 3333… ; pays fictif « xx ». Échanges FICTIFS anciens, supprimés à la fin.
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

create function pg_temp.connecter(p_utilisateur text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_utilisateur, false)
$$;

insert into echanges_professeur (eleve_id, chapitre_id, auteur, contenu, cree_le) values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-0000000000f1', 'eleve', 'Échange fictif ancien',
   now() - interval '400 days');
create temporary table avant as
  select (select count(*) from echanges_professeur) as echanges, (select count(*) from profils) as profils,
         (select count(*) from signalements) as signalements,
         (select conservation from pays where code = 'xx') as conservation;

-- SD01 Réservé à l'administration ; pays inconnu refusé.
select pg_temp.connecter('33333333-3333-3333-3333-333333333333');
set role authenticated;
do $$ begin
  begin perform simulation_sort_donnees('xx'); raise exception 'SD01 : référent simule';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select pg_temp.connecter('55555555-5555-4555-8555-555555555555');
set role authenticated;
do $$ begin
  begin perform simulation_sort_donnees('inconnu'); raise exception 'SD01 : pays inconnu';
  exception when invalid_parameter_value then null; end;
end $$;
reset role;

-- SD02 Sept catégories, en nombres ; durée vide = rien à effacer ; avec une durée, les plus anciens comptent.
update pays set conservation = '{"echanges_jours": null}'::jsonb where code = 'xx';
select pg_temp.connecter('55555555-5555-4555-8555-555555555555');
set role authenticated;
do $$ declare e record; begin
  assert (select count(*) from simulation_sort_donnees('xx')) = 7, 'SD02 : sept catégories';
  select * into e from simulation_sort_donnees('xx') where categorie = 'echanges';
  assert e.duree_jours is null and e.a_effacer = 0 and e.total >= 1, 'SD02 : durée vide, rien à effacer';
end $$;
reset role;
update pays set conservation = '{"echanges_jours": 365, "compte_inactif_jours": 730}'::jsonb where code = 'xx';
select pg_temp.connecter('55555555-5555-4555-8555-555555555555');
set role authenticated;
do $$ declare e record; begin
  select * into e from simulation_sort_donnees('xx') where categorie = 'echanges';
  assert e.duree_jours = 365 and e.a_effacer >= 1 and e.a_effacer <= e.total, 'SD02 : échange ancien compté';
end $$;
reset role;

-- SD03 Rien n'est effacé par la simulation.
do $$ begin
  assert (select echanges from avant) = (select count(*) from echanges_professeur), 'SD03 : échanges intacts';
  assert (select profils from avant) = (select count(*) from profils), 'SD03 : comptes intacts';
  assert (select signalements from avant) = (select count(*) from signalements), 'SD03 : signalements intacts';
end $$;

delete from echanges_professeur where contenu = 'Échange fictif ancien';
update pays set conservation = (select conservation from avant) where code = 'xx';

\o
\echo 'OK SD01 simulation du sort des données réservée à l''administration'
\echo 'OK SD02 sept catégories en nombres, selon les durées du pack'
\echo 'OK SD03 la simulation n''efface rien'
