-- Tests des rapports aux parents (Jalon 3, étape 4). Après 47 : l'élève 1111… a un accord d'inscription
-- (contact fictif) et un ancien accord aux rapports révoqué.
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

create function pg_temp.connecter(p_utilisateur text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_utilisateur, false)
$$;
create temp table jetons (cle text primary key, valeur text);
grant select, insert, update on jetons to public;

-- RP01 L'élève demande l'accord ; le contact est celui de l'inscription ; une seule demande à la fois.
select pg_temp.connecter('11111111-1111-1111-1111-111111111111');
set role authenticated;
do $$
declare v record;
begin
  select * into v from demander_consentement_rapports();
  assert v.contact = '+999 000 000 99', 'RP01 : contact de l''inscription';
  insert into jetons values ('accord', v.jeton);
  begin
    perform demander_consentement_rapports();
    raise exception 'RP01 : seconde demande acceptée';
  exception when invalid_parameter_value then null;
  end;
end $$;
reset role;
select pg_temp.connecter('');
set role anon;
do $$ begin
  assert accepter_rapports_parents((select valeur from jetons where cle = 'accord')), 'RP01 : accord refusé';
  assert not accepter_rapports_parents((select valeur from jetons where cle = 'accord')), 'RP01 : jeton réutilisé';
  assert not accepter_rapports_parents('faux'), 'RP01 : faux jeton accepté';
end $$;
reset role;
\echo OK RP01 accord demandé par l élève, accordé par le parent, jeton à usage unique

-- RP02 Envoi : seul le service de messagerie obtient le contact, une seule fois par rapport.
select set_config('app.eleve_id', '11111111-1111-1111-1111-111111111111', false), set_config('app.unite_id', '', false);
set role agent_tuteur;
do $$
declare v_id uuid;
begin
  assert exists (select 1 from rapports_hebdomadaires_dus() where eleve_id = '11111111-1111-1111-1111-111111111111'),
    'RP02 : rapport hebdomadaire dû';
  insert into rapports_parents (eleve_id, consentement_id, periode, contenu)
  select '11111111-1111-1111-1111-111111111111', id, 'hebdomadaire', '{"progression": "fictif"}'
  from consentements where eleve_id = '11111111-1111-1111-1111-111111111111' and type = 'rapport_parents'
    and revoque_le is null
  returning id into v_id;
  insert into jetons values ('rapport', v_id::text);
  begin
    perform preparer_envoi_rapport(v_id);
    raise exception 'RP02 : le Tuteur obtient le contact';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
set role service_messagerie;
do $$
declare v record;
begin
  select * into v from preparer_envoi_rapport((select valeur from jetons where cle = 'rapport')::uuid);
  assert v.contact = '+999 000 000 99' and length(v.jeton) = 64, 'RP02 : envoi préparé';
  update jetons set valeur = v.jeton where cle = 'accord';
  assert not exists (select 1 from preparer_envoi_rapport((select valeur from jetons where cle = 'rapport')::uuid)),
    'RP02 : rapport envoyé deux fois';
  begin
    perform 1 from consentements;
    raise exception 'RP02 : la messagerie lit les consentements';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
\echo OK RP02 contact transmis au seul service de messagerie, une fois par rapport

-- RP03 Le parent lit le rapport par son lien et peut arrêter ; plus aucun envoi ensuite.
set role anon;
do $$
declare v record;
begin
  select * into v from rapport_par_jeton((select valeur from jetons where cle = 'accord'));
  assert v.accord_actif and v.contenu ->> 'progression' = 'fictif', 'RP03 : rapport lisible par son lien';
  assert not exists (select 1 from rapport_par_jeton('faux')), 'RP03 : faux lien';
  assert arreter_rapports_parents((select valeur from jetons where cle = 'accord')), 'RP03 : arrêt';
  select * into v from rapport_par_jeton((select valeur from jetons where cle = 'accord'));
  assert not v.accord_actif, 'RP03 : accord encore actif après l''arrêt';
end $$;
reset role;
set role agent_tuteur;
do $$ begin
  begin
    insert into rapports_parents (eleve_id, consentement_id, periode, contenu)
    select '11111111-1111-1111-1111-111111111111', id, 'a_la_demande', '{}'
    from consentements where eleve_id = '11111111-1111-1111-1111-111111111111' and type = 'rapport_parents'
    order by demande_le desc limit 1;
    raise exception 'RP03 : rapport après arrêt';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
\echo OK RP03 rapport consulté par son lien, arrêt par le parent

-- RP04 L'élève peut aussi retirer son accord ; il peut redemander ensuite.
select pg_temp.connecter('11111111-1111-1111-1111-111111111111');
set role authenticated;
do $$ begin
  perform demander_consentement_rapports();
  assert revoquer_rapports_parents(), 'RP04 : retrait par l''élève';
  assert not exists (select 1 from consentements where type = 'rapport_parents' and revoque_le is null),
    'RP04 : accord encore actif';
end $$;
reset role;
\echo OK RP04 retrait de l accord par l élève

\echo TOUS LES TESTS DES RAPPORTS AUX PARENTS SONT PASSÉS
