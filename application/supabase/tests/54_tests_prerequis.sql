-- Tests du graphe de prérequis (Jalon 4, étape 1). Après 40 (référent Maths 7777…) et l'import du pack pilote.
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

create function pg_temp.connecter(p_utilisateur text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_utilisateur, false)
$$;
create function pg_temp.lien(p_chapitre text, p_prerequis text) returns record language sql as $$
  select (select c.id from chapitres c join unites u on u.id = c.unite_id
          where u.code || '/' || c.code = p_chapitre),
         (select c.id from chapitres c join unites u on u.id = c.unite_id
          where u.code || '/' || c.code = p_prerequis)
$$;

-- G01 Le graphe du pack est importé « à valider », entre classes ; import idempotent.
do $$ begin
  assert (select count(*) from prerequis_chapitres p join chapitres c on c.id = p.chapitre_id
          join unites u on u.id = c.unite_id where u.code like 'ga-%-mathematiques') = 70, 'G01 : nombre de liens (collège 44, lycée 26)';
  assert not exists (select 1 from prerequis_chapitres where statut <> 'a_valider'), 'G01 : lien déjà validé';
  assert exists (
    select 1 from prerequis_chapitres p
    join chapitres a on a.id = p.chapitre_id join unites ua on ua.id = a.unite_id
    join chapitres b on b.id = p.prerequis_id join unites ub on ub.id = b.unite_id
    where ua.code = 'ga-3e-mathematiques' and ub.code = 'ga-4e-mathematiques'), 'G01 : aucun lien entre classes';
end $$;
\echo OK G01 graphe importé à valider, liens entre classes

-- G02 Seul un référent de la famille décide ; le rejet exige un commentaire ; personne n'écrit directement.
insert into auth.users (id) values ('88888888-8888-4888-8888-888888888801');
insert into profils (id, role, prenom_ou_pseudo) values ('88888888-8888-4888-8888-888888888801', 'eleve', 'Élève fictif G');
select pg_temp.connecter('88888888-8888-4888-8888-888888888801');
set role authenticated;
do $$
declare a uuid; b uuid;
begin
  select * into a, b from pg_temp.lien('ga-3e-mathematiques/thales', 'ga-4e-mathematiques/triangles-semblables') as (a uuid, b uuid);
  begin
    perform decider_prerequis(a, b, 'valide');
    raise exception 'G02 : décision par un élève';
  exception when insufficient_privilege then null;
  end;
  begin
    update prerequis_chapitres set statut = 'valide';
    raise exception 'G02 : écriture directe acceptée';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
do $$ begin
  assert not exists (select 1 from prerequis_chapitres where statut <> 'a_valider'), 'G02 : écriture directe';
end $$;
select pg_temp.connecter('77777777-7777-4777-8777-777777777777');
set role authenticated;
do $$
declare a uuid; b uuid; c uuid; d uuid;
begin
  select * into a, b from pg_temp.lien('ga-3e-mathematiques/thales', 'ga-4e-mathematiques/triangles-semblables') as (a uuid, b uuid);
  select * into c, d from pg_temp.lien('ga-3e-mathematiques/trigonometrie', 'ga-3e-mathematiques/thales') as (c uuid, d uuid);
  assert decider_prerequis(a, b, 'valide'), 'G02 : validation par le référent';
  begin
    perform decider_prerequis(c, d, 'rejete');
    raise exception 'G02 : rejet sans commentaire';
  exception when invalid_parameter_value then null;
  end;
  assert decider_prerequis(c, d, 'rejete', 'Lien utile mais pas nécessaire.'), 'G02 : rejet commenté';
end $$;
reset role;
do $$ begin
  assert (select count(*) from prerequis_chapitres where statut = 'valide' and decide_par = '77777777-7777-4777-8777-777777777777') = 1,
    'G02 : validation non tracée';
  assert (select count(*) from prerequis_chapitres where statut = 'rejete' and commentaire is not null) = 1, 'G02 : rejet non tracé';
end $$;
\echo OK G02 décision réservée au référent de la famille, tracée

-- G03 Les agents ne voient que les liens validés.
set role agent_tuteur;
do $$ begin
  assert (select count(*) from prerequis_chapitres) = 1, 'G03 : le Tuteur voit des liens non validés';
end $$;
reset role;
update prerequis_chapitres set statut = 'a_valider', decide_par = null, decide_le = null, commentaire = null;
\echo OK G03 seuls les liens validés servent aux agents

-- G04 Lycée (ADR 0047) : un prérequis d'une autre série est refusé ; un prérequis sans série vaut pour tous.
do $$
declare v_tle_d uuid; v_1re_c uuid; v_1re_d uuid;
begin
  select c.id into v_tle_d from chapitres c join unites u on u.id = c.unite_id
  where u.code = 'ga-tle-d-mathematiques' and c.code = 'probabilites-statistiques';
  select c.id into v_1re_c from chapitres c join unites u on u.id = c.unite_id
  where u.code = 'ga-1re-c-mathematiques' and c.code = 'suites';
  select c.id into v_1re_d from chapitres c join unites u on u.id = c.unite_id
  where u.code = 'ga-1re-d-mathematiques' and c.code = 'suites';
  begin
    insert into prerequis_chapitres (chapitre_id, prerequis_id, nature) values (v_tle_d, v_1re_c, 'souple');
    raise exception 'G04 : prérequis d''une autre série accepté';
  exception when invalid_parameter_value then null;
  end;
  insert into prerequis_chapitres (chapitre_id, prerequis_id, nature) values (v_tle_d, v_1re_d, 'souple');
  delete from prerequis_chapitres where chapitre_id = v_tle_d and prerequis_id = v_1re_d;
  assert (select count(*) from prerequis_chapitres p join chapitres c on c.id = p.chapitre_id
          join unites u on u.id = c.unite_id where u.code = 'ga-2nde-mathematiques') = 9, 'G04 : liens de la Seconde';
end $$;
\echo OK G04 aucun prérequis d une autre série

\echo TOUS LES TESTS DU GRAPHE DE PRÉREQUIS SONT PASSÉS
