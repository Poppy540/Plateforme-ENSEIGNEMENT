-- Capacité de la classe (décision D10 ; ADR 0093). Après 76 : élèves fictifs 1111… et 2222… (même référentiel et
-- niveau), administrateur 5555…, référent 3333…. Classe et alerte FICTIVES, supprimées à la fin.
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

create function pg_temp.connecter(p_utilisateur text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_utilisateur, false)
$$;

insert into classes (id, referentiel_id, niveau_id, nom, etablissement, empreinte_code, code_expire_le) values
  ('00000000-0000-0000-0000-0000000ca9a1', '00000000-0000-0000-0000-0000000000a1',
   '00000000-0000-0000-0000-0000000000b1', 'Classe fictive de capacité', 'Collège fictif',
   empreinte_code_saisi('CAPA-CITE-0001'), now() + interval '30 days');

-- CC01 Capacité fixée par l'administration seulement, de 1 à 200, tracée.
select pg_temp.connecter('33333333-3333-3333-3333-333333333333');
set role authenticated;
do $$ begin
  begin perform definir_capacite_classe('00000000-0000-0000-0000-0000000ca9a1', 1, 'x');
    raise exception 'CC01 : référent fixe la capacité';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select pg_temp.connecter('55555555-5555-4555-8555-555555555555');
set role authenticated;
do $$ begin
  begin perform definir_capacite_classe('00000000-0000-0000-0000-0000000ca9a1', 0, 'x');
    raise exception 'CC01 : capacité nulle';
  exception when invalid_parameter_value then null; end;
  perform definir_capacite_classe('00000000-0000-0000-0000-0000000ca9a1', 1, 'empreinte-admin');
  assert (select capacite from classes_admin() where id = '00000000-0000-0000-0000-0000000ca9a1') = 1,
    'CC01 : capacité lue par l''administration';
end $$;
reset role;
do $$ begin
  assert (select count(*) from journal_audit where action = 'capacite_classe') = 1, 'CC01 : audit';
end $$;

-- CC02 Classe pleine : le deuxième élève est refusé (null), une seule alerte sans élève ; le premier peut
-- re-saisir le code de sa propre classe.
select pg_temp.connecter('11111111-1111-1111-1111-111111111111');
set role authenticated;
do $$ begin
  assert rejoindre_classe('capa-cite-0001') = 'Classe fictive de capacité', 'CC02 : premier élève';
  assert rejoindre_classe('CAPA-CITE-0001') = 'Classe fictive de capacité', 'CC02 : déjà dans la classe';
end $$;
reset role;
select pg_temp.connecter('22222222-2222-2222-2222-222222222222');
set role authenticated;
do $$ begin
  assert rejoindre_classe('CAPA-CITE-0001') is null, 'CC02 : classe pleine';
  assert rejoindre_classe('CAPA-CITE-0001') is null, 'CC02 : toujours pleine';
end $$;
reset role;
do $$ begin
  assert (select classe_id from eleves where id = '22222222-2222-2222-2222-222222222222') is null,
    'CC02 : le deuxième élève n''est pas rattaché';
  assert (select count(*) from signalements where source = 'plateforme'
          and resume like 'Classe « Classe fictive de capacité »%complète%') = 1, 'CC02 : une seule alerte';
  assert not exists (select 1 from signalements where source = 'plateforme' and eleve_id is not null),
    'CC02 : alerte sans élève';
end $$;

delete from signalements where source = 'plateforme' and resume like 'Classe « Classe fictive de capacité »%';
update eleves set classe_id = null where classe_id = '00000000-0000-0000-0000-0000000ca9a1';
delete from classes where id = '00000000-0000-0000-0000-0000000ca9a1';

\o
\echo 'OK CC01 capacité de la classe fixée par l''administration, contrôlée et tracée'
\echo 'OK CC02 classe pleine : élève refusé, une seule alerte sans élève'
