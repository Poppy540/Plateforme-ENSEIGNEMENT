-- Classes créées et gérées depuis l'administration (Jalon 10, étape 2 ; ADR 0067). Après 48 (administrateur
-- 5555…) ; référentiel fictif « xx-general », niveau n4 (élève A 1111…).
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

create function pg_temp.connecter(p_utilisateur text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_utilisateur, false)
$$;
create function pg_temp.e(p_code text) returns text language sql as $$
  select encode(sha256(convert_to(p_code, 'UTF8')), 'hex')
$$;

-- H01 Réservé à l'administration.
select pg_temp.connecter('33333333-3333-3333-3333-333333333333');
set role authenticated;
do $$ begin
  begin perform creer_classe('xx-general', 'n4', null, 'X', 'Y', pg_temp.e('A'), pg_temp.e('B'), 30, 7, 'x');
    raise exception 'H01 : référent crée une classe';
  exception when insufficient_privilege then null; end;
  begin perform 1 from classes_admin(); raise exception 'H01 : référent liste les classes';
  exception when insufficient_privilege then null; end;
  begin perform options_classe(); raise exception 'H01 : référent lit les options';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- H02 Création contrôlée et tracée sans code ; les deux codes fonctionnent.
select pg_temp.connecter('55555555-5555-4555-8555-555555555555');
set role authenticated;
do $$ begin
  assert (select o -> 'niveaux' @> '[{"code": "n4"}]' from jsonb_array_elements(options_classe()) o
          where o ->> 'referentiel' = 'xx-general'), 'H02 : options';
  begin perform creer_classe('xx-general', 'n9', null, 'X', 'Y', pg_temp.e('A'), pg_temp.e('B'), 30, 7, 'x');
    raise exception 'H02 : niveau inconnu accepté';
  exception when invalid_parameter_value then null; end;
  begin perform creer_classe('xx-general', 'n4', 'S9', 'X', 'Y', pg_temp.e('A'), pg_temp.e('B'), 30, 7, 'x');
    raise exception 'H02 : série inconnue acceptée';
  exception when invalid_parameter_value then null; end;
  begin perform creer_classe('xx-general', 'n4', null, ' ', 'Y', pg_temp.e('A'), pg_temp.e('B'), 30, 7, 'x');
    raise exception 'H02 : nom vide accepté';
  exception when invalid_parameter_value then null; end;
  begin perform creer_classe('xx-general', 'n4', null, 'X', 'Y', 'CODE-EN-CLAIR', pg_temp.e('B'), 30, 7, 'x');
    raise exception 'H02 : code en clair accepté';
  exception when invalid_parameter_value then null; end;
  begin perform creer_classe('xx-general', 'n4', null, 'X', 'Y', pg_temp.e('A'), pg_temp.e('B'), 30, 90, 'x');
    raise exception 'H02 : durée d''invitation acceptée';
  exception when invalid_parameter_value then null; end;
  perform creer_classe('xx-general', 'n4', '', 'Classe admin H', 'Établissement fictif',
                       pg_temp.e('TEST-CLAD-0001'), pg_temp.e('TEST-ENAD-0001'), 30, 7, 'empreinte-admin');
  assert (select invitation_en_attente and eleves = 0 and enseignants = '{}'
          from classes_admin() where nom = 'Classe admin H'), 'H02 : liste';
end $$;
reset role;
do $$ begin
  assert (select count(*) from journal_audit where action = 'creation_classe') = 1, 'H02 : audit';
  assert not exists (select 1 from journal_audit where details::text ~ 'TEST-(CLAD|ENAD)'), 'H02 : code dans l''audit';
end $$;
insert into auth.users (id) values ('b0000000-0000-4000-8000-0000000000b1');
select pg_temp.connecter('b0000000-0000-4000-8000-0000000000b1');
set role authenticated;
select activer_enseignant('TEST-ENAD-0001', 'Enseignant fictif H');
reset role;
select pg_temp.connecter('11111111-1111-1111-1111-111111111111');
set role authenticated;
do $$ begin assert rejoindre_classe('TEST-CLAD-0001') = 'Classe admin H', 'H02 : code de classe'; end $$;
reset role;

-- H03 Nouveau code de classe (l'ancien cesse de marcher), nouvelle invitation, annulation.
select pg_temp.connecter('55555555-5555-4555-8555-555555555555');
set role authenticated;
do $$ declare v uuid; begin
  select id into v from classes_admin() where nom = 'Classe admin H';
  assert (select eleves = 1 and enseignants = '{Enseignant fictif H}' and not invitation_en_attente
          from classes_admin() where id = v), 'H03 : élève et enseignant comptés';
  assert nouveau_code_classe(v, pg_temp.e('TEST-CLAD-0002'), 30, 'empreinte-admin'), 'H03 : nouveau code';
  assert nouvelle_invitation_enseignant(v, pg_temp.e('TEST-ENAD-0002'), 7, 'empreinte-admin'), 'H03 : invitation';
  assert (select invitation_en_attente from classes_admin() where id = v), 'H03 : invitation en attente';
  assert annuler_invitations_enseignant(v, 'empreinte-admin') = 1, 'H03 : annulation';
  assert not (select invitation_en_attente from classes_admin() where id = v), 'H03 : plus d''invitation';
end $$;
reset role;
select pg_temp.connecter('11111111-1111-1111-1111-111111111111');
set role authenticated;
do $$ begin
  perform quitter_classe();
  begin perform rejoindre_classe('TEST-CLAD-0001'); raise exception 'H03 : ancien code accepté';
  exception when invalid_parameter_value then null; end;
  assert rejoindre_classe('TEST-CLAD-0002') = 'Classe admin H', 'H03 : nouveau code';
  perform quitter_classe();
end $$;
reset role;
insert into auth.users (id) values ('b0000000-0000-4000-8000-0000000000b2');
select pg_temp.connecter('b0000000-0000-4000-8000-0000000000b2');
set role authenticated;
do $$ begin
  begin perform activer_enseignant('TEST-ENAD-0002', 'Autre'); raise exception 'H03 : invitation annulée acceptée';
  exception when invalid_parameter_value then null; end;
end $$;
reset role;
do $$ begin
  assert (select count(*) from journal_audit where action in
          ('nouveau_code_classe', 'invitation_enseignant', 'annulation_invitation_enseignant')) = 3, 'H03 : audit';
end $$;

\o
\echo 'OK H01 classes réservées à l''administration'
\echo 'OK H02 création contrôlée et tracée, sans les codes ; codes de classe et d''enseignant valides'
\echo 'OK H03 nouveau code, nouvelle invitation, annulation'
