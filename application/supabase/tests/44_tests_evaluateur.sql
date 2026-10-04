-- Tests de l'agent Évaluateur (Jalon 2, étape 4). Après 43_tests_contenus.sql : un quiz validé sur le
-- chapitre 1 de ga-3e-mathematiques, avec une tentative de l'élève 1111… ; référent fictif 7777… (mathématiques).
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

create function pg_temp.connecter(p_utilisateur text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_utilisateur, false)
$$;
create function pg_temp.agent(p_eleve text) returns void language sql as $$
  select set_config('app.eleve_id', coalesce(p_eleve, ''), false),
         set_config('app.unite_id', (select id::text from unites where code = 'ga-3e-mathematiques'), false)
$$;
create temp table ids (cle text primary key, valeur uuid);
grant select on ids to public;
insert into ids
select 'quiz', q.id from quiz q join chapitres c on c.id = q.chapitre_id join unites u on u.id = c.unite_id
where u.code = 'ga-3e-mathematiques' and q.statut = 'valide' limit 1;
insert into ids
select 'tentative', t.id from tentatives_quiz t
where t.quiz_id = (select valeur from ids where cle = 'quiz') and t.eleve_id = '11111111-1111-1111-1111-111111111111';
do $$ begin
  assert (select count(*) from ids) = 2, 'préalable : quiz validé et tentative de l''élève A';
end $$;

-- V01 Une seule tentative notée par élève et par quiz.
select pg_temp.agent('11111111-1111-1111-1111-111111111111');
set role agent_evaluateur;
do $$ begin
  begin
    insert into tentatives_quiz (quiz_id, eleve_id, reponses, score)
    values ((select valeur from ids where cle = 'quiz'), '11111111-1111-1111-1111-111111111111', '[]', 100);
    raise exception 'V01 : seconde tentative notée';
  exception when unique_violation then null;
  end;
end $$;
reset role;
\echo OK V01 une seule tentative notée par élève et par quiz

-- V02 Contestations : seulement sur la tentative de l'élève du contexte ; lues par lui seul.
set role agent_evaluateur;
do $$ begin
  insert into contestations_quiz (tentative_id, question, message, reexamen)
  values ((select valeur from ids where cle = 'tentative'), 0, 'Je pense avoir juste.', '{"maintenue": true}');
end $$;
reset role;
select pg_temp.agent('22222222-2222-2222-2222-222222222222');
set role agent_evaluateur;
do $$ begin
  assert (select count(*) from contestations_quiz) = 0, 'V02 : contestation d''un autre élève visible';
  begin
    insert into contestations_quiz (tentative_id, question, message)
    values ((select valeur from ids where cle = 'tentative'), 0, 'Pour un autre élève.');
    raise exception 'V02 : contestation sur la tentative d''un autre élève';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select pg_temp.connecter('11111111-1111-1111-1111-111111111111');
set role authenticated;
do $$ begin
  assert (select count(*) from contestations_quiz) = 1, 'V02 : l''élève ne voit pas sa contestation';
  begin
    insert into contestations_quiz (tentative_id, question, message)
    values ((select valeur from ids where cle = 'tentative'), 0, 'Directement.');
    raise exception 'V02 : écriture directe par l''élève';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
\echo OK V02 contestations limitées à l élève du contexte

-- V03 Signalements de l'Évaluateur : source imposée, élève du contexte seulement.
select pg_temp.agent('11111111-1111-1111-1111-111111111111');
set role agent_evaluateur;
do $$ begin
  insert into signalements (source, motif, priorite, eleve_id, chapitre_id, resume)
  select 'agent_evaluateur', 'erreur_contenu', 2, '11111111-1111-1111-1111-111111111111', chapitre_id,
    'Correction contestée deux fois (test).'
  from quiz where id = (select valeur from ids where cle = 'quiz');
  begin
    insert into signalements (source, motif, priorite, eleve_id, resume)
    values ('agent_evaluateur', 'autre', 3, '22222222-2222-2222-2222-222222222222', 'Autre élève');
    raise exception 'V03 : signalement pour un autre élève';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into signalements (source, motif, priorite, resume) values ('agent_professeur', 'autre', 3, 'Usurpation');
    raise exception 'V03 : source usurpée';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
\echo OK V03 signalements de l Évaluateur pour l élève du contexte

-- V04 Statistiques : réservées au référent de la famille, rien en dessous de 5 tentatives, agrégats ensuite.
select pg_temp.connecter('11111111-1111-1111-1111-111111111111');
set role authenticated;
do $$ begin
  begin
    perform statistiques_quiz((select valeur from ids where cle = 'quiz'));
    raise exception 'V04 : statistiques lues par un élève';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select pg_temp.connecter('77777777-7777-4777-8777-777777777777');
set role authenticated;
do $$ begin
  assert (select count(*) from statistiques_quiz((select valeur from ids where cle = 'quiz'), 1)) = 0,
    'V04 : statistiques sous le seuil de 5 tentatives';
end $$;
reset role;
-- Quatre élèves fictifs de plus (5 tentatives au total).
insert into auth.users (id) select ('00000000-0000-4000-8000-00000000000' || n)::uuid from generate_series(1, 4) n;
insert into profils (id, role, prenom_ou_pseudo)
select ('00000000-0000-4000-8000-00000000000' || n)::uuid, 'eleve', 'Fictif ' || n from generate_series(1, 4) n;
insert into eleves (id, referentiel_id, niveau_id, est_mineur, statut)
select ('00000000-0000-4000-8000-00000000000' || n)::uuid, e.referentiel_id, e.niveau_id, false, 'actif'
from generate_series(1, 4) n, eleves e where e.id = '11111111-1111-1111-1111-111111111111';
insert into tentatives_quiz (quiz_id, eleve_id, reponses, score)
select (select valeur from ids where cle = 'quiz'), ('00000000-0000-4000-8000-00000000000' || n)::uuid,
  jsonb_build_array(jsonb_build_object('question', 0, 'choix', case when n <= 2 then '1' else '0' end,
    'points', case when n <= 2 then 0 else 1 end)), case when n <= 2 then 0 else 100 end
from generate_series(1, 4) n;
-- La tentative de l'élève A (C07) n'a pas de réponse détaillée : on compte 5 tentatives, 4 réponses à la question 0.
set role authenticated;
do $$
declare v record;
begin
  select * into v from statistiques_quiz((select valeur from ids where cle = 'quiz'));
  assert v.question = 0 and v.tentatives = 4, 'V04 : agrégat par question';
  assert v.taux_reussite = 50, 'V04 : taux de réussite';
  assert v.repartition = '{"0": 2, "1": 2}'::jsonb, 'V04 : répartition des choix';
end $$;
reset role;
\echo OK V04 statistiques anonymisées réservées au référent, seuil de 5 tentatives

\echo TOUS LES TESTS DE L ÉVALUATEUR SONT PASSÉS
