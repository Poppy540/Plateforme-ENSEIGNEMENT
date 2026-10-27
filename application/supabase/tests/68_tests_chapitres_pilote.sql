-- Chapitres du pilote et accueil du référent (Jalon 11, étape 1 ; ADR 0070). Après 48 (administrateur 5555…) ;
-- unité fictive « xx-n4-maths » (chapitres c1 validé, c2 à valider), référents maths 3333… et histoire 4444….
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

create function pg_temp.connecter(p_utilisateur text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_utilisateur, false)
$$;

-- CP01 Choix des chapitres du pilote : administration seulement, contrôlé, tracé.
select pg_temp.connecter('33333333-3333-3333-3333-333333333333');
set role authenticated;
do $$ begin
  begin perform definir_chapitres_pilote('xx-n4-maths', '{c1}', 'x'); raise exception 'CP01 : référent choisit';
  exception when insufficient_privilege then null; end;
  begin perform 1 from chapitres_pilote; raise exception 'CP01 : table lisible';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select pg_temp.connecter('55555555-5555-4555-8555-555555555555');
set role authenticated;
do $$ begin
  begin perform definir_chapitres_pilote('xx-n4-maths', '{c9}', 'x'); raise exception 'CP01 : chapitre inconnu';
  exception when invalid_parameter_value then null; end;
  begin perform definir_chapitres_pilote('xx-n4-maths', '{h1}', 'x'); raise exception 'CP01 : chapitre d''une autre unité';
  exception when invalid_parameter_value then null; end;
  assert definir_chapitres_pilote('xx-n4-maths', '{c1,c2}', 'empreinte-admin') = 2, 'CP01 : deux chapitres';
  assert definir_chapitres_pilote('xx-n4-maths', '{c2}', 'empreinte-admin') = 1, 'CP01 : remplacement';
  assert definir_chapitres_pilote('xx-n4-maths', '{c1,c2}', 'empreinte-admin') = 2, 'CP01 : remis';
  assert (select pilote from unites_pour_pilote() where unite = 'xx-n4-maths') = 2, 'CP01 : compte par unité';
  assert (select count(*) from chapitres_unite_pilote('xx-n4-maths') where pilote) = 2, 'CP01 : chapitres marqués';
end $$;
reset role;
do $$ begin
  assert (select count(*) from journal_audit where action = 'chapitres_pilote') = 3, 'CP01 : audit';
end $$;

-- CP02 Le référent voit les chapitres du pilote de SES familles, avec l'état des contenus.
select pg_temp.connecter('33333333-3333-3333-3333-333333333333');
set role authenticated;
do $$ begin
  assert (select count(*) from etat_chapitres_pilote()) = 2, 'CP02 : chapitres du référent de maths';
  assert not exists (select 1 from etat_chapitres_pilote() e join chapitres c on c.id = e.chapitre_id
                     where e.statut_chapitre <> c.statut::text), 'CP02 : statut du chapitre';
end $$;
reset role;
select pg_temp.connecter('44444444-4444-4444-4444-444444444444');
set role authenticated;
do $$ begin
  assert (select count(*) from etat_chapitres_pilote()) = 0, 'CP02 : référent d''histoire';
end $$;
reset role;
select pg_temp.connecter('11111111-1111-1111-1111-111111111111');
set role authenticated;
do $$ begin
  begin perform 1 from etat_chapitres_pilote(); raise exception 'CP02 : élève lit l''état';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- CP03 Accueil vu une fois.
select pg_temp.connecter('33333333-3333-3333-3333-333333333333');
set role authenticated;
select marquer_accueil_vu();
reset role;
do $$ declare v timestamptz; begin
  select accueil_vu_le into v from profils where id = '33333333-3333-3333-3333-333333333333';
  assert v is not null, 'CP03 : accueil marqué';
end $$;

delete from chapitres_pilote;

\o
\echo 'OK CP01 chapitres du pilote choisis par l''administration, contrôlés et tracés'
\echo 'OK CP02 le référent voit les chapitres du pilote de ses familles, avec leur état'
\echo 'OK CP03 accueil du référent marqué comme vu'
