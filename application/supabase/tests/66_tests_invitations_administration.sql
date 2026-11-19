-- Invitations de référents depuis l'administration (Jalon 10, étape 1 ; ADR 0066). Après 48 (administrateur
-- 5555…) ; référentiel fictif « xx-general » (familles mathematiques, histoire-geo-ses).
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

create function pg_temp.connecter(p_utilisateur text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_utilisateur, false)
$$;

-- U01 Réservé à l'administration.
select pg_temp.connecter('33333333-3333-3333-3333-333333333333');
set role authenticated;
do $$ begin
  begin perform creer_invitation_referent('xx-general', '{mathematiques}', 7, repeat('a', 64), 'x');
    raise exception 'U01 : référent crée une invitation';
  exception when insufficient_privilege then null; end;
  begin perform 1 from invitations_referents_admin(); raise exception 'U01 : référent lit les invitations';
  exception when insufficient_privilege then null; end;
  begin perform 1 from options_invitation_referent(); raise exception 'U01 : référent lit les options';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- U02 Création contrôlée : référentiel, familles, durée, empreinte ; tracée sans le code.
select pg_temp.connecter('55555555-5555-4555-8555-555555555555');
set role authenticated;
do $$ declare v uuid; begin
  assert (select familles from options_invitation_referent() where referentiel = 'xx-general')
    = '{histoire-geo-ses,mathematiques}', 'U02 : familles proposées';
  begin perform creer_invitation_referent('xx-general', '{philosophie}', 7, repeat('a', 64), 'x');
    raise exception 'U02 : famille inconnue acceptée';
  exception when invalid_parameter_value then null; end;
  begin perform creer_invitation_referent('xx-general', '{mathematiques}', 90, repeat('a', 64), 'x');
    raise exception 'U02 : durée acceptée';
  exception when invalid_parameter_value then null; end;
  begin perform creer_invitation_referent('xx-general', '{mathematiques}', 7, 'TEST-CODE-CLAIR', 'x');
    raise exception 'U02 : code en clair accepté';
  exception when invalid_parameter_value then null; end;
  v := creer_invitation_referent('xx-general', '{mathematiques}', 7,
         encode(sha256(convert_to('TEST-ADMI-0001', 'UTF8')), 'hex'), 'empreinte-admin');
  assert (select etat from invitations_referents_admin() where id = v) = 'en_attente', 'U02 : en attente';
  v := creer_invitation_referent('xx-general', '{histoire-geo-ses}', 7,
         encode(sha256(convert_to('TEST-ADMI-0002', 'UTF8')), 'hex'), 'empreinte-admin');
end $$;
reset role;
do $$ begin
  assert (select count(*) from journal_audit where action = 'creation_invitation_referent') = 2, 'U02 : audit';
  assert not exists (select 1 from journal_audit where details::text like '%TEST-ADMI%'), 'U02 : code dans l''audit';
end $$;

-- U03 Annulation : le code ne marche plus ; une invitation utilisée ne s'annule pas.
insert into auth.users (id) values ('a0000000-0000-4000-8000-0000000000a1'), ('a0000000-0000-4000-8000-0000000000a2');
select pg_temp.connecter('a0000000-0000-4000-8000-0000000000a1');
set role authenticated;
select activer_referent('TEST-ADMI-0001', 'Référent fictif U03');
reset role;
select pg_temp.connecter('55555555-5555-4555-8555-555555555555');
set role authenticated;
do $$
declare v_utilisee uuid; v_attente uuid;
begin
  select id into v_utilisee from invitations_referents_admin() where etat = 'utilisee' and referent = 'Référent fictif U03';
  assert v_utilisee is not null, 'U03 : utilisée, avec le prénom';
  assert not annuler_invitation_referent(v_utilisee, 'empreinte-admin'), 'U03 : utilisée annulée';
  select id into v_attente from invitations_referents_admin() where etat = 'en_attente' and familles = '{histoire-geo-ses}';
  assert annuler_invitation_referent(v_attente, 'empreinte-admin'), 'U03 : annulation';
  assert (select etat from invitations_referents_admin() where id = v_attente) = 'annulee', 'U03 : état annulée';
end $$;
reset role;
select pg_temp.connecter('a0000000-0000-4000-8000-0000000000a2');
set role authenticated;
do $$ begin
  begin perform activer_referent('TEST-ADMI-0002', 'Autre'); raise exception 'U03 : code annulé accepté';
  exception when invalid_parameter_value then null; end;
end $$;
reset role;
do $$ begin
  assert (select count(*) from journal_audit where action = 'annulation_invitation_referent') = 1, 'U03 : audit';
end $$;

\o
\echo 'OK U01 invitations réservées à l''administration'
\echo 'OK U02 création contrôlée et tracée, sans le code'
\echo 'OK U03 annulation : le code ne permet plus de s''activer'
