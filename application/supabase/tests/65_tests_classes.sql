-- Classes du pilote et vue agrégée de l'enseignant (Jalon 9, étape 2 ; ADR 0063). Données fictives du pays « xx ».
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

create function pg_temp.connecter(p_utilisateur text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_utilisateur, false)
$$;

-- Une classe de niveau 4 (et une autre), leurs codes, deux enseignants fictifs, des élèves fictifs de niveau 4.
insert into classes (id, referentiel_id, niveau_id, nom, etablissement, empreinte_code, code_expire_le) values
  ('00000000-0000-0000-0000-00000000c1a5', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1',
   'Classe fictive A', 'Établissement fictif', empreinte_code_saisi('TEST-CLASSE-0001'), now() + interval '30 days'),
  ('00000000-0000-0000-0000-00000000c1a6', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1',
   'Classe fictive B', 'Établissement fictif', empreinte_code_saisi('TEST-CLASSE-0002'), now() - interval '1 day');
insert into invitations_enseignants (empreinte_code, classe_id, expire_le) values
  (empreinte_code_saisi('TEST-ENSE-0001'), '00000000-0000-0000-0000-00000000c1a5', now() + interval '1 day'),
  (empreinte_code_saisi('TEST-ENSE-0002'), '00000000-0000-0000-0000-00000000c1a6', now() + interval '1 day');
insert into auth.users (id) values ('e0000000-0000-4000-8000-0000000000e1'), ('e0000000-0000-4000-8000-0000000000e2');
insert into auth.users (id) select ('c0000000-0000-4000-8000-00000000000' || i)::uuid from generate_series(1, 6) i;
insert into profils (id, role, prenom_ou_pseudo)
  select ('c0000000-0000-4000-8000-00000000000' || i)::uuid, 'eleve', 'Élève fictif ' || i from generate_series(1, 6) i;
insert into eleves (id, referentiel_id, niveau_id, est_mineur, statut)
  select ('c0000000-0000-4000-8000-00000000000' || i)::uuid, '00000000-0000-0000-0000-0000000000a1',
         '00000000-0000-0000-0000-0000000000b1', true, 'actif' from generate_series(1, 6) i;
update profils set derniere_activite = now() where id::text like 'c0000000-%';

-- E01 Activation de l'enseignant : code personnel, usage unique, jamais sur un compte d'élève.
select pg_temp.connecter('11111111-1111-1111-1111-111111111111');
set role authenticated;
do $$ begin
  begin perform activer_enseignant('TEST-ENSE-0001', 'X'); raise exception 'E01 : élève devenu enseignant';
  exception when invalid_parameter_value then null; end;
end $$;
reset role;
select pg_temp.connecter('e0000000-0000-4000-8000-0000000000e1');
set role authenticated;
do $$ begin
  begin perform activer_enseignant('MAUVAIS-CODE', 'Enseignant fictif'); raise exception 'E01 : mauvais code accepté';
  exception when invalid_parameter_value then null; end;
  perform activer_enseignant(' test-ense-0001 ', 'Enseignant fictif');
  assert (select count(*) from mes_classes()) = 1, 'E01 : classe de l''enseignant';
  assert (select nom from mes_classes()) = 'Classe fictive A', 'E01 : nom de classe';
end $$;
reset role;
select pg_temp.connecter('e0000000-0000-4000-8000-0000000000e2');
set role authenticated;
do $$ begin
  begin perform activer_enseignant('TEST-ENSE-0001', 'Autre'); raise exception 'E01 : code réutilisé';
  exception when invalid_parameter_value then null; end;
  perform activer_enseignant('TEST-ENSE-0002', 'Enseignant fictif B');
end $$;
reset role;
do $$ begin
  assert (select role from profils where id = 'e0000000-0000-4000-8000-0000000000e1') = 'enseignant', 'E01 : rôle';
end $$;

-- E02 L'élève rejoint sa classe avec le code ; code expiré ou d'un autre niveau refusé ; il peut la quitter.
select pg_temp.connecter('11111111-1111-1111-1111-111111111111');
set role authenticated;
do $$ begin
  begin perform rejoindre_classe('TEST-CLASSE-0002'); raise exception 'E02 : code expiré accepté';
  exception when invalid_parameter_value then null; end;
  assert rejoindre_classe('test-classe-0001') = 'Classe fictive A', 'E02 : rejoindre';
  assert (select nom from ma_classe()) = 'Classe fictive A', 'E02 : ma classe';
  perform quitter_classe();
  assert not exists (select 1 from ma_classe()), 'E02 : quitter';
  assert rejoindre_classe('TEST-CLASSE-0001') = 'Classe fictive A', 'E02 : rejoindre à nouveau';
  begin perform 1 from classes; raise exception 'E02 : table des classes lisible';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
update eleves set niveau_id = '00000000-0000-0000-0000-0000000000b2' where id = '22222222-2222-2222-2222-222222222222';
select pg_temp.connecter('22222222-2222-2222-2222-222222222222');
set role authenticated;
do $$ begin
  begin perform rejoindre_classe('TEST-CLASSE-0001'); raise exception 'E02 : autre niveau accepté';
  exception when invalid_parameter_value then null; end;
end $$;
reset role;
update eleves set niveau_id = '00000000-0000-0000-0000-0000000000b1' where id = '22222222-2222-2222-2222-222222222222';

-- E03 Tableau : rien sous 5 élèves ; ensuite des agrégats seulement, petits nombres masqués ; aucune donnée d'élève.
update eleves set classe_id = '00000000-0000-0000-0000-00000000c1a5'
  where id::text in ('c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002');
select pg_temp.connecter('e0000000-0000-4000-8000-0000000000e1');
set role authenticated;
do $$ declare t jsonb := tableau_classe('00000000-0000-0000-0000-00000000c1a5'); begin
  assert (t ->> 'masque')::boolean and t -> 'eleves' = 'null'::jsonb and not t ? 'chapitres', 'E03 : moins de 5 élèves';
end $$;
reset role;
update eleves set classe_id = '00000000-0000-0000-0000-00000000c1a5' where id::text like 'c0000000-%';
-- L'élève A est ramené « en cours » sur le chapitre validé (statut d'origine rétabli à la fin).
create temp table progression_a as select * from progression
  where eleve_id = '11111111-1111-1111-1111-111111111111' and chapitre_id = '00000000-0000-0000-0000-0000000000f1';
grant select on progression_a to public;
update progression set statut = 'en_cours'
  where eleve_id = '11111111-1111-1111-1111-111111111111' and chapitre_id = '00000000-0000-0000-0000-0000000000f1';
insert into progression (eleve_id, chapitre_id, statut)
  select ('c0000000-0000-4000-8000-00000000000' || i)::uuid, '00000000-0000-0000-0000-0000000000f1',
         case when i <= 5 then 'termine' else 'en_cours' end::statut_progression from generate_series(1, 6) i;
insert into progression (eleve_id, chapitre_id, statut)
  values ('c0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-0000000000f3', 'en_cours');
select pg_temp.connecter('e0000000-0000-4000-8000-0000000000e1');
set role authenticated;
do $$ declare t jsonb := tableau_classe('00000000-0000-0000-0000-00000000c1a5'); c jsonb; h jsonb; begin
  assert not (t ->> 'masque')::boolean, 'E03 : tableau rendu';
  assert (t ->> 'eleves')::int = 7, 'E03 : 6 fictifs + élève A';
  select x into c from jsonb_array_elements(t -> 'chapitres') x where x ->> 'chapitre' = 'Chapitre validé';
  assert (c ->> 'commence')::int = 7 and (c ->> 'termine')::int = 5, 'E03 : avancement du chapitre';
  select x into h from jsonb_array_elements(t -> 'chapitres') x where x ->> 'chapitre' = 'Histoire validée';
  assert h -> 'commence' = 'null'::jsonb, 'E03 : un seul élève : masqué';
  assert not exists (select 1 from jsonb_array_elements(t -> 'chapitres') x where x ->> 'chapitre' = 'Chapitre à valider'),
    'E03 : chapitre non validé absent';
  assert t::text !~ '(c0000000|11111111|Élève)', 'E03 : aucun identifiant ni prénom d''élève';
  -- Aucune lecture directe de données d'élèves.
  assert (select count(*) from eleves) = 0 and (select count(*) from progression) = 0, 'E03 : lignes d''élèves lisibles';
  begin perform 1 from tentatives_quiz; exception when insufficient_privilege then null; end;
  assert (select count(*) from profils where role = 'eleve') = 0, 'E03 : profils d''élèves lisibles';
  begin perform tableau_classe('00000000-0000-0000-0000-00000000c1a6'); raise exception 'E03 : classe d''un autre';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select pg_temp.connecter('11111111-1111-1111-1111-111111111111');
set role authenticated;
do $$ begin
  begin perform tableau_classe('00000000-0000-0000-0000-00000000c1a5'); raise exception 'E03 : élève lit le tableau';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set role anon;
do $$ begin
  begin perform tableau_classe('00000000-0000-0000-0000-00000000c1a5'); raise exception 'E03 : visiteur';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- E04 Quiz : score moyen et notions manquées seulement à partir de 5 élèves.
insert into quiz (id, chapitre_id, questions, cree_par) values ('00000000-0000-0000-0000-00000000c1a7',
  '00000000-0000-0000-0000-0000000000f1',
  '[{"enonce": "Q fictive 1", "notion": "Notion fictive manquée"}, {"enonce": "Q fictive 2", "notion": "Notion fictive rare"}]',
  'agent_evaluateur');
update quiz set statut = 'valide' where id = '00000000-0000-0000-0000-00000000c1a7';
insert into tentatives_quiz (quiz_id, eleve_id, reponses, score)
  select '00000000-0000-0000-0000-00000000c1a7', ('c0000000-0000-4000-8000-00000000000' || i)::uuid,
    jsonb_build_array(
      jsonb_build_object('question', 0, 'correction', jsonb_build_object('resultat', case when i <= 5 then 'faux' else 'juste' end)),
      jsonb_build_object('question', 1, 'correction', jsonb_build_object('resultat', case when i <= 2 then 'faux' else 'juste' end))),
    case when i <= 5 then 40 else 100 end
  from generate_series(1, 6) i;
select pg_temp.connecter('e0000000-0000-4000-8000-0000000000e1');
set role authenticated;
do $$ declare t jsonb := tableau_classe('00000000-0000-0000-0000-00000000c1a5'); c jsonb; begin
  select x into c from jsonb_array_elements(t -> 'chapitres') x where x ->> 'chapitre' = 'Chapitre validé';
  assert (c ->> 'quiz')::int = 6 and (c ->> 'score_moyen')::int = 50, 'E04 : quiz et score moyen';
  assert jsonb_array_length(t -> 'notions') = 1, 'E04 : une seule notion diffusable';
  assert t -> 'notions' -> 0 ->> 'notion' = 'Notion fictive manquée'
     and (t -> 'notions' -> 0 ->> 'en_difficulte')::int = 5, 'E04 : notion manquée par 5 élèves';
end $$;
reset role;
delete from tentatives_quiz where quiz_id = '00000000-0000-0000-0000-00000000c1a7'
  and eleve_id::text in ('c0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000006');
select pg_temp.connecter('e0000000-0000-4000-8000-0000000000e1');
set role authenticated;
do $$ declare t jsonb := tableau_classe('00000000-0000-0000-0000-00000000c1a5'); c jsonb; begin
  select x into c from jsonb_array_elements(t -> 'chapitres') x where x ->> 'chapitre' = 'Chapitre validé';
  assert c -> 'quiz' = 'null'::jsonb and c -> 'score_moyen' = 'null'::jsonb, 'E04 : 4 élèves : masqué';
  assert jsonb_array_length(t -> 'notions') = 0, 'E04 : notion de 4 élèves masquée';
end $$;
reset role;

-- Remise en état pour les tests suivants (conservation) : élèves A et B hors classe, données de test retirées.
delete from tentatives_quiz where quiz_id = '00000000-0000-0000-0000-00000000c1a7';
delete from quiz where id = '00000000-0000-0000-0000-00000000c1a7';
delete from progression where eleve_id::text like 'c0000000-%'
  or (eleve_id = '11111111-1111-1111-1111-111111111111' and chapitre_id = '00000000-0000-0000-0000-0000000000f3');
update eleves set classe_id = null where classe_id is not null;
update progression p set statut = a.statut from progression_a a
  where p.eleve_id = a.eleve_id and p.chapitre_id = a.chapitre_id;

\o
\echo 'OK E01 activation de l''enseignant de la classe'
\echo 'OK E02 l''élève rejoint ou quitte sa classe avec le code'
\echo 'OK E03 tableau agrégé, masqué sous 5 élèves, aucune donnée d''élève'
\echo 'OK E04 quiz et notions manquées à partir de 5 élèves'
