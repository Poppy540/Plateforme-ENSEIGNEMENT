-- Tests de l'agent Coordinateur côté base (Jalon 4, étape 2). Après 40 (référent Maths 7777…), 44 (quiz validé
-- de 3e avec 5 tentatives et élèves fictifs 0000…1-4) et 54.
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

create function pg_temp.connecter(p_utilisateur text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_utilisateur, false)
$$;
create function pg_temp.famille(p_famille text) returns void language sql as $$
  select set_config('app.eleve_id', '', false), set_config('app.unite_id', '', false),
         set_config('app.referentiel_id', (select id::text from referentiels where code = 'ga-general'), false),
         set_config('app.famille', p_famille, false)
$$;
create temp table ids (cle text primary key, valeur uuid);
grant select, insert on ids to public;

-- Un second quiz validé de la famille, avec seulement 3 tentatives (groupe trop petit).
insert into quiz (chapitre_id, questions, cree_par)
select c.id, '[{"type":"vrai_faux","enonce":"Test","reponse":true}]'::jsonb, 'test'
from chapitres c join unites u on u.id = c.unite_id where u.code = 'ga-4e-mathematiques' and c.code = 'puissances';
update quiz set statut = 'valide' where cree_par = 'test';
insert into tentatives_quiz (quiz_id, eleve_id, reponses, score)
select (select id from quiz where cree_par = 'test'), ('00000000-0000-4000-8000-00000000000' || n)::uuid,
  '[{"question":0,"points":1}]'::jsonb, 100
from generate_series(1, 3) n;

-- K01 Aucune donnée d'élève ; seulement les chapitres et contenus validés de sa famille.
select pg_temp.famille('mathematiques');
set role agent_coordinateur;
do $$ begin
  begin perform 1 from eleves; raise exception 'K01 : élèves lisibles';
  exception when insufficient_privilege then null; end;
  begin perform 1 from progression; raise exception 'K01 : progression lisible';
  exception when insufficient_privilege then null; end;
  begin perform 1 from tentatives_quiz; raise exception 'K01 : tentatives lisibles';
  exception when insufficient_privilege then null; end;
  begin perform 1 from echanges_professeur; raise exception 'K01 : échanges lisibles';
  exception when insufficient_privilege then null; end;
  assert (select count(*) from chapitres) > 0, 'K01 : aucun chapitre de la famille';
  assert not exists (
    select 1 from chapitres c join unites u on u.id = c.unite_id join matieres m on m.id = u.matiere_id
    where m.famille <> 'mathematiques' or u.code not like 'ga-%'), 'K01 : chapitre hors famille';
  assert not exists (select 1 from scripts where statut <> 'valide'), 'K01 : brouillon de script lisible';
  assert not exists (select 1 from quiz where statut <> 'valide'), 'K01 : brouillon de quiz lisible';
end $$;
reset role;
select pg_temp.famille('francais');
set role agent_coordinateur;
do $$ begin
  -- Depuis le Jalon 7 (Français 3e), la famille Français a ses chapitres : elle ne voit qu'eux.
  assert (select count(*) from chapitres) > 0, 'K01 : aucun chapitre de Français';
  assert not exists (
    select 1 from chapitres c join unites u on u.id = c.unite_id join matieres m on m.id = u.matiere_id
    where m.famille <> 'francais'), 'K01 : chapitres de Maths visibles pour la famille Français';
end $$;
reset role;
\echo OK K01 aucune donnée d élève, seulement sa famille

-- K02 Statistiques agrégées : quiz d'au moins 5 tentatives seulement, seuil jamais abaissé.
select pg_temp.famille('mathematiques');
set role agent_coordinateur;
do $$ begin
  assert (select count(*) from statistiques_famille()) > 0, 'K02 : statistiques du quiz de 5 tentatives absentes';
  assert (select count(*) from (select * from statistiques_famille(1) except select * from statistiques_famille()) x) = 0,
    'K02 : seuil abaissé';
  assert (select count(distinct quiz_id) from statistiques_famille(1)) = 1, 'K02 : groupe de 3 analysé';
  assert quiz_trop_petits_famille() = 1, 'K02 : groupe trop petit non compté';
end $$;
reset role;
\echo OK K02 statistiques agrégées à partir de 5 tentatives seulement

-- K03 Rapports : écrits en brouillon pour sa seule famille ; lus par les référents de la famille seulement.
set role agent_coordinateur;
do $$
declare v uuid;
begin
  begin
    insert into rapports_coordinateur (referentiel_id, famille, contenu)
    values (contexte_agent('referentiel_id'), 'francais', '{}');
    raise exception 'K03 : rapport pour une autre famille';
  exception when insufficient_privilege then null;
  end;
  insert into rapports_coordinateur (referentiel_id, famille, contenu)
  values (contexte_agent('referentiel_id'), 'mathematiques', '{
    "propositions_liens": [
      {"chapitre": "ga-4e-mathematiques/translations", "prerequis": "ga-6e-mathematiques/symetrie-axiale", "nature": "souple"},
      {"chapitre": "ga-6e-mathematiques/entiers", "prerequis": "ga-6e-mathematiques/decimaux", "nature": "strict"},
      {"chapitre": "ga-4e-mathematiques/puissances", "prerequis": "ga-3e-mathematiques/thales", "nature": "strict"}
    ],
    "glossaire": [{"terme": "Fraction", "definition": "Test", "niveaux": ["6e"], "notation": "a/b"}]
  }') returning id into v;
  insert into ids values ('rapport', v);
end $$;
reset role;
do $$ begin
  assert (select statut = 'brouillon' and version = 1 from rapports_coordinateur), 'K03 : statut ou version';
end $$;
select pg_temp.connecter('88888888-8888-4888-8888-888888888801');
set role authenticated;
do $$ begin
  assert (select count(*) from rapports_coordinateur) = 0, 'K03 : rapport lisible par un élève';
  begin
    perform accepter_lien_coordinateur((select valeur from ids where cle = 'rapport'), 0);
    raise exception 'K03 : décision par un élève';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
\echo OK K03 rapports en brouillon, réservés à la famille

-- K04 Décisions du référent : lien accepté (validé), cycle et classe supérieure refusés, rejet commenté,
-- glossaire adopté comme charte, rapport clos.
select pg_temp.connecter('77777777-7777-4777-8777-777777777777');
set role authenticated;
do $$
declare r uuid := (select valeur from ids where cle = 'rapport');
begin
  assert (select count(*) from rapports_coordinateur) = 1, 'K04 : rapport invisible pour le référent';
  assert accepter_lien_coordinateur(r, 0), 'K04 : lien valable refusé';
  begin perform accepter_lien_coordinateur(r, 0); raise exception 'K04 : décision en double';
  exception when invalid_parameter_value then null; end;
  begin perform accepter_lien_coordinateur(r, 1); raise exception 'K04 : cycle accepté';
  exception when invalid_parameter_value then null; end;
  begin perform accepter_lien_coordinateur(r, 2); raise exception 'K04 : prérequis de classe supérieure accepté';
  exception when invalid_parameter_value then null; end;
  begin perform ecarter_proposition_coordinateur(r, 'lien', 1, ' '); raise exception 'K04 : rejet sans remarque';
  exception when invalid_parameter_value then null; end;
  assert ecarter_proposition_coordinateur(r, 'lien', 1, 'Crée un cycle.'), 'K04 : rejet commenté';
  assert adopter_glossaire_coordinateur(r) = 1, 'K04 : glossaire non adopté';
  assert clore_rapport_coordinateur(r), 'K04 : rapport non clos';
end $$;
reset role;
do $$ begin
  assert exists (
    select 1 from prerequis_chapitres p
    where p.chapitre_id = chapitre_par_reference((select id from referentiels where code = 'ga-general'), 'ga-4e-mathematiques/translations')
      and p.prerequis_id = chapitre_par_reference((select id from referentiels where code = 'ga-general'), 'ga-6e-mathematiques/symetrie-axiale')
      and p.statut = 'valide' and p.decide_par = '77777777-7777-4777-8777-777777777777'), 'K04 : lien accepté non validé';
  assert (select count(*) from chartes_famille) = 1, 'K04 : charte absente';
  assert (select statut from rapports_coordinateur) = 'traite', 'K04 : statut du rapport';
end $$;
select pg_temp.famille('mathematiques');
set role agent_coordinateur;
do $$ begin
  assert (select count(*) from chartes_famille) = 1, 'K04 : charte invisible pour le Coordinateur';
end $$;
reset role;
\echo OK K04 décisions du référent, contrôles de cycle et de classe

\echo TOUS LES TESTS DU COORDINATEUR SONT PASSÉS
