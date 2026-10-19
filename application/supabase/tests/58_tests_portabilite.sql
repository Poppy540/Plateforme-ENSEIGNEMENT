-- Essai de portabilité (Jalon 4, étape 5 ; ADR 0041) : le pack FICTIF « zz » (referentiels/zz-fictif, statut test)
-- est importé à côté du pilote sans modifier le code. Aucun mélange entre pays. Après 40 (référent 7777…) et 57.
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

create function pg_temp.connecter(p_utilisateur text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_utilisateur, false)
$$;
create temp table ids (cle text primary key, valeur uuid);
grant select, insert on ids to public;
insert into ids select 'ga', id from referentiels where code = 'ga-general';
insert into ids select 'zz', id from referentiels where code = 'zz-general';

-- Y01 Import : statut test, structure propre, aucun lien de prérequis entre pays, le pilote inchangé.
do $$
declare v_zz uuid := (select valeur from ids where cle = 'zz');
begin
  assert (select statut_pack from pays where code = 'zz') = 'test', 'Y01 : statut du pack de test';
  assert (select count(*) from unites where referentiel_id = v_zz) = 6, 'Y01 : unités du pays Z';
  assert (select count(*) from niveaux where referentiel_id = v_zz) = 4, 'Y01 : niveaux du pays Z';
  assert (select count(*) from unites where referentiel_id = (select valeur from ids where cle = 'ga')) = 67,
    'Y01 : unités du pilote modifiées';
  assert not exists (select 1 from chapitres c join unites u on u.id = c.unite_id
                     where u.referentiel_id = v_zz and (c.statut <> 'a_valider' or c.volume_horaire is null)),
    'Y01 : chapitres du pays Z validés ou sans volume horaire';
  assert (select count(*) from prerequis_chapitres p join chapitres c on c.id = p.chapitre_id
          join unites u on u.id = c.unite_id where u.referentiel_id = v_zz) = 3, 'Y01 : prérequis du pays Z';
  assert not exists (
    select 1 from prerequis_chapitres p
    join chapitres c1 on c1.id = p.chapitre_id join unites u1 on u1.id = c1.unite_id
    join chapitres c2 on c2.id = p.prerequis_id join unites u2 on u2.id = c2.unite_id
    where u1.referentiel_id <> u2.referentiel_id), 'Y01 : prérequis entre deux pays';
  -- Une unité porte une série du seul référentiel de son pays.
  assert not exists (
    select 1 from unites_series us join unites u on u.id = us.unite_id join series s on s.id = us.serie_id
    where s.referentiel_id <> u.referentiel_id), 'Y01 : série d''un autre pays';
end $$;
\echo OK Y01 pack de test importé à côté du pilote, sans mélange

-- Y02 Inscription : classes et options du seul pays choisi.
insert into auth.users (id) values ('99999999-9999-4999-8999-999999999901'), ('99999999-9999-4999-8999-999999999902');
select pg_temp.connecter('99999999-9999-4999-8999-999999999901');
set role authenticated;
do $$ begin
  begin
    perform inscrire_eleve('Zoé', 'zz-general', '3e', null, true, '+000 00 00 01');
    raise exception 'Y02 : classe du pilote acceptée dans le pays Z';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform inscrire_eleve('Zoé', 'zz-general', 'an4', 'C', true, '+000 00 00 01');
    raise exception 'Y02 : série du pilote acceptée dans le pays Z';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform inscrire_eleve('Zoé', 'zz-general', 'an4', null, true, '+000 00 00 01');
    raise exception 'Y02 : option obligatoire absente acceptée';
  exception when invalid_parameter_value then null;
  end;
  perform inscrire_eleve('Zoé', 'zz-general', 'an4', 'SCI', true, '+000 00 00 01');
  assert (select r.code from eleves e join referentiels r on r.id = e.referentiel_id) = 'zz-general',
    'Y02 : référentiel de l''élève';
end $$;
reset role;
select pg_temp.connecter('99999999-9999-4999-8999-999999999902');
set role authenticated;
do $$ begin
  begin
    perform inscrire_eleve('Kofi', 'ga-general', 'an3', null, true, '+000 00 00 02');
    raise exception 'Y02 : classe du pays Z acceptée dans le pilote';
  exception when invalid_parameter_value then null;
  end;
end $$;
reset role;
\echo OK Y02 inscription limitée aux classes et options du pays choisi

-- Y03 Référents : chacun valide dans son pays et sa famille seulement.
insert into auth.users (id) values ('99999999-9999-4999-8999-999999999903');
insert into profils (id, role, prenom_ou_pseudo) values ('99999999-9999-4999-8999-999999999903', 'referent', 'Référent fictif Z');
insert into referents_familles (referent_id, referentiel_id, famille)
select '99999999-9999-4999-8999-999999999903', valeur, 'mathematiques' from ids where cle = 'zz';
select pg_temp.connecter('99999999-9999-4999-8999-999999999903');
set role authenticated;
do $$
declare c record;
begin
  assert est_referent_unite((select id from unites where code = 'zz-an3-mathematiques')), 'Y03 : unité du pays Z';
  assert not est_referent_unite((select id from unites where code = 'ga-3e-mathematiques')),
    'Y03 : référent du pays Z reconnu dans le pilote';
  select c2.id, c2.version into c from chapitres c2 join unites u on u.id = c2.unite_id
  where u.code = 'zz-an3-mathematiques' and c2.ordre = 1;
  perform valider_chapitre(c.id, 'valide', c.version, 'Relu (fictif)');
  select c2.id, c2.version into c from chapitres c2 join unites u on u.id = c2.unite_id
  where u.code = 'ga-3e-mathematiques' and c2.ordre = 2;
  begin
    perform valider_chapitre(c.id, 'valide', c.version, 'Hors pays');
    raise exception 'Y03 : chapitre du pilote validé par un référent du pays Z';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select pg_temp.connecter('77777777-7777-4777-8777-777777777777');
set role authenticated;
do $$
declare c record;
begin
  select c2.id, c2.version into c from chapitres c2 join unites u on u.id = c2.unite_id
  where u.code = 'zz-an3-mathematiques' and c2.ordre = 2;
  begin
    perform valider_chapitre(c.id, 'valide', c.version, 'Hors pays');
    raise exception 'Y03 : chapitre du pays Z validé par un référent du pilote';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
\echo OK Y03 validation limitée au pays et à la famille du référent

-- Y04 Agents : Coordinateur et Conformité ne voient que le référentiel fixé par le serveur.
select set_config('app.eleve_id', '', false), set_config('app.unite_id', '', false),
       set_config('app.referentiel_id', (select valeur::text from ids where cle = 'zz'), false),
       set_config('app.famille', 'mathematiques', false);
set role agent_coordinateur;
do $$ begin
  assert (select count(*) from chapitres) > 0, 'Y04 : coordinateur du pays Z sans chapitre';
  assert not exists (select 1 from chapitres c join unites u on u.id = c.unite_id where u.code not like 'zz-%'),
    'Y04 : coordinateur du pays Z voit un autre pays';
end $$;
reset role;
select set_config('app.unite_id', (select id::text from unites where code = 'zz-an3-mathematiques'), false),
       set_config('app.document_id', '', false);
set role agent_conformite;
do $$ begin
  assert not exists (select 1 from chapitres c join unites u on u.id = c.unite_id where u.code not like 'zz-%'),
    'Y04 : conformité du pays Z voit un autre pays';
  assert (select count(*) from documents_officiels) = 0, 'Y04 : document d''un autre pays visible';
end $$;
reset role;
\echo OK Y04 Coordinateur et Conformité cloisonnés par référentiel

-- Y05 Professeur : l'unité du pays Z ne voit que ses chapitres validés.
select set_config('app.eleve_id', '99999999-9999-4999-8999-999999999901', false),
       set_config('app.unite_id', (select id::text from unites where code = 'zz-an3-mathematiques'), false);
set role agent_professeur;
do $$ begin
  assert (select count(*) from chapitres) = 1, 'Y05 : chapitres visibles par le professeur du pays Z';
  assert (select titre from chapitres) like '%(pays Z)', 'Y05 : chapitre d''un autre pays';
end $$;
reset role;
\echo OK Y05 Professeur limité à son unité du pays Z

\echo TOUS LES TESTS DE PORTABILITÉ SONT PASSÉS
