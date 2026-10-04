-- Tests des scripts, vidéos, quiz et tentatives (Jalon 2, étape 1). Après 40_tests_referents.sql :
-- le référent fictif 7777… (mathématiques) a validé le chapitre 1 de ga-3e-mathematiques.
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

create function pg_temp.connecter(p_utilisateur text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_utilisateur, false)
$$;
create function pg_temp.agent(p_eleve text, p_unite text) returns void language sql as $$
  select set_config('app.eleve_id', coalesce(p_eleve, ''), false),
         set_config('app.unite_id', coalesce((select id::text from unites where code = p_unite), ''), false)
$$;
create temp table ids (cle text primary key, valeur uuid);
grant select, insert, update on ids to public;
insert into ids
select 'chapitre', c.id from chapitres c join unites u on u.id = c.unite_id
where u.code = 'ga-3e-mathematiques' and c.ordre = 1;
insert into ids
select 'chapitre_non_valide', c.id from chapitres c join unites u on u.id = c.unite_id
where u.code = 'ga-3e-mathematiques' and c.ordre = 2;
insert into ids
select 'chapitre_autre_unite', c.id from chapitres c join unites u on u.id = c.unite_id
where u.code <> 'ga-3e-mathematiques' and c.statut = 'valide' limit 1;
do $$ begin
  assert (select statut from chapitres where id = (select valeur from ids where cle = 'chapitre')) = 'valide',
    'préalable : chapitre 1 non validé';
  assert (select valeur from ids where cle = 'chapitre_autre_unite') is not null, 'préalable : autre unité';
end $$;

-- C01 Le Scénariste écrit un brouillon (version 1, statut imposé) pour un chapitre validé de son unité seulement.
select pg_temp.agent(null, 'ga-3e-mathematiques');
set role agent_scenariste;
do $$
declare v_id uuid;
begin
  insert into scripts (chapitre_id, contenu, duree_cible_minutes, cree_par)
  values ((select valeur from ids where cle = 'chapitre'), '{"sections": [{"texte": "Bonjour"}]}', 10, 'agent_scenariste')
  returning id into v_id;
  insert into ids values ('script', v_id);
  assert (select version from scripts where id = v_id) = 1, 'C01 : version initiale';
  assert (select statut from scripts where id = v_id) = 'brouillon', 'C01 : statut brouillon';
  assert (select empreinte from scripts where id = v_id) = empreinte_jsonb('{"sections": [{"texte": "Bonjour"}]}'),
    'C01 : empreinte';
  begin
    insert into scripts (chapitre_id, contenu, duree_cible_minutes, cree_par)
    values ((select valeur from ids where cle = 'chapitre_non_valide'), '{}', 10, 'agent_scenariste');
    raise exception 'C01 : script sur un chapitre non validé';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into scripts (chapitre_id, contenu, duree_cible_minutes, cree_par)
    values ((select valeur from ids where cle = 'chapitre_autre_unite'), '{}', 10, 'agent_scenariste');
    raise exception 'C01 : script hors de l''unité';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into scripts (chapitre_id, contenu, duree_cible_minutes, cree_par, statut)
    values ((select valeur from ids where cle = 'chapitre'), '{}', 10, 'agent_scenariste', 'valide');
    raise exception 'C01 : statut choisi par l''agent';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
\echo OK C01 brouillon de script écrit par le Scénariste dans son unité seulement

-- C02 Le contenu est figé : ni l'agent ni personne ne le modifie ; une nouvelle version est créée à la place.
set role agent_scenariste;
do $$ begin
  begin
    update scripts set contenu = '{"modifie": true}' where id = (select valeur from ids where cle = 'script');
    raise exception 'C02 : script modifié par l''agent';
  exception when insufficient_privilege then null;
  end;
  insert into scripts (chapitre_id, contenu, duree_cible_minutes, cree_par)
  values ((select valeur from ids where cle = 'chapitre'), '{"sections": [{"texte": "Bonjour v2"}]}', 10, 'agent_scenariste');
  assert (select max(version) from scripts where chapitre_id = (select valeur from ids where cle = 'chapitre')) = 2,
    'C02 : nouvelle version';
end $$;
reset role;
do $$ begin
  begin
    update scripts set contenu = '{"modifie": true}' where id = (select valeur from ids where cle = 'script');
    raise exception 'C02 : script modifié';
  exception when insufficient_privilege then null;
  end;
end $$;
\echo OK C02 contenu figé, toute modification crée une nouvelle version

-- C03 Production vidéo : aucun script non validé n'est visible ni utilisable.
set role agent_production_video;
do $$ begin
  assert (select count(*) from scripts) = 0, 'C03 : brouillon visible par la production';
  begin
    insert into videos (script_id, script_version, script_empreinte, reference_hebergement)
    select id, version, empreinte, 'fictif' from scripts where id = (select valeur from ids where cle = 'script');
    insert into videos (script_id, script_version, script_empreinte, reference_hebergement)
    values ((select valeur from ids where cle = 'script'), 1, 'x', 'fictif');
    raise exception 'C03 : vidéo produite depuis un brouillon';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
\echo OK C03 production impossible depuis un script non validé

-- C04 Seul un référent de la famille valide, et seulement la version relue ; les agents et les élèves ne valident pas.
select pg_temp.connecter('11111111-1111-1111-1111-111111111111');
set role authenticated;
do $$ begin
  assert (select count(*) from scripts) = 0, 'C04 : brouillon visible par un élève';
  begin
    perform valider_contenu('script', (select valeur from ids where cle = 'script'), 'valide', 1);
    raise exception 'C04 : validation par un élève';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
set role agent_scenariste;
do $$ begin
  begin
    perform valider_contenu('script', (select valeur from ids where cle = 'script'), 'valide', 1);
    raise exception 'C04 : validation par un agent';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select pg_temp.connecter('77777777-7777-4777-8777-777777777777');
set role authenticated;
do $$ begin
  assert (select count(*) from scripts) = 2, 'C04 : le référent ne voit pas les scripts de sa famille';
  begin
    perform valider_contenu('script', (select valeur from ids where cle = 'script'), 'valide', 2);
    raise exception 'C04 : validation d''une autre version que celle relue';
  exception when serialization_failure then null;
  end;
  perform valider_contenu('script', (select valeur from ids where cle = 'script'), 'valide', 1, 'Relu');
  assert (select statut from scripts where id = (select valeur from ids where cle = 'script')) = 'valide',
    'C04 : script non validé';
  assert (select count(*) from approbations where objet_type = 'script'
          and objet_id = (select valeur from ids where cle = 'script') and version = 1) = 1, 'C04 : décision non tracée';
  begin
    perform valider_contenu('script', (select valeur from ids where cle = 'script'), 'rejete', 1);
    raise exception 'C04 : seconde décision acceptée';
  exception when invalid_parameter_value then null;
  end;
end $$;
reset role;
\echo OK C04 validation par le référent de la famille, version relue, décision unique et tracée

-- C05 La production vérifie version et empreinte ; la vidéo est toujours déposée « à relire ».
set role agent_production_video;
do $$
declare v_id uuid;
begin
  assert (select count(*) from scripts) = 1, 'C05 : la production doit voir le seul script validé';
  begin
    insert into videos (script_id, script_version, script_empreinte, reference_hebergement)
    select id, version + 1, empreinte, 'fictif' from scripts;
    raise exception 'C05 : version différente acceptée';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into videos (script_id, script_version, script_empreinte, reference_hebergement)
    select id, version, 'empreinte-fausse', 'fictif' from scripts;
    raise exception 'C05 : empreinte différente acceptée';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into videos (script_id, script_version, script_empreinte, reference_hebergement, statut)
    select id, version, empreinte, 'fictif', 'publiee' from scripts;
    raise exception 'C05 : statut choisi par la production';
  exception when insufficient_privilege then null;
  end;
  insert into videos (script_id, script_version, script_empreinte, reference_hebergement, duree_secondes, cout_usd)
  select id, version, empreinte, 'video-fictive-1', 600, 9.9 from scripts
  returning id into v_id;
  insert into ids values ('video', v_id);
  assert (select statut from videos where id = v_id) = 'a_relire', 'C05 : vidéo pas à relire';
  begin
    perform publier_video(v_id);
    raise exception 'C05 : publication par la production';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
\echo OK C05 vidéo rattachée à la version validée exacte, déposée à relire, jamais publiée par l agent

-- C06 Publication : acte humain distinct, après validation ; l'élève ne voit que la vidéo publiée.
select pg_temp.connecter('11111111-1111-1111-1111-111111111111');
set role authenticated;
do $$ begin
  assert (select count(*) from videos) = 0, 'C06 : vidéo à relire visible par un élève';
end $$;
reset role;
select pg_temp.connecter('77777777-7777-4777-8777-777777777777');
set role authenticated;
do $$ begin
  begin
    perform publier_video((select valeur from ids where cle = 'video'));
    raise exception 'C06 : publication sans validation';
  exception when invalid_parameter_value then null;
  end;
  perform valider_contenu('video', (select valeur from ids where cle = 'video'), 'valide', 1, 'Regardée');
  perform publier_video((select valeur from ids where cle = 'video'));
  assert (select statut from videos where id = (select valeur from ids where cle = 'video')) = 'publiee',
    'C06 : vidéo non publiée';
  assert (select count(*) from approbations where objet_type = 'publication_video') = 1, 'C06 : publication non tracée';
end $$;
reset role;
select pg_temp.connecter('11111111-1111-1111-1111-111111111111');
set role authenticated;
do $$ begin
  assert (select count(*) from videos) = 1, 'C06 : vidéo publiée invisible pour un élève';
end $$;
reset role;
\echo OK C06 validation puis publication par un humain, vidéo publiée seule visible

-- C07 Évaluateur : quiz brouillon, invisibles des élèves ; tentative seulement pour l'élève du contexte et un quiz validé.
select pg_temp.agent('11111111-1111-1111-1111-111111111111', 'ga-3e-mathematiques');
set role agent_evaluateur;
do $$
declare v_id uuid;
begin
  insert into quiz (chapitre_id, questions, cree_par)
  values ((select valeur from ids where cle = 'chapitre'), '[{"enonce": "Question fictive", "reponse": "A"}]', 'agent_evaluateur')
  returning id into v_id;
  insert into ids values ('quiz', v_id);
  assert (select statut from quiz where id = v_id) = 'brouillon', 'C07 : quiz pas brouillon';
  begin
    insert into tentatives_quiz (quiz_id, eleve_id, reponses, score)
    values (v_id, '11111111-1111-1111-1111-111111111111', '[]', 50);
    raise exception 'C07 : tentative sur un quiz non validé';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select pg_temp.connecter('77777777-7777-4777-8777-777777777777');
set role authenticated;
select valider_contenu('quiz', (select valeur from ids where cle = 'quiz'), 'valide', 1);
reset role;
select pg_temp.connecter('11111111-1111-1111-1111-111111111111');
set role authenticated;
do $$ begin
  assert (select count(*) from quiz) = 0, 'C07 : les réponses du quiz sont lisibles par un élève';
end $$;
reset role;
set role agent_evaluateur;
do $$ begin
  begin
    insert into tentatives_quiz (quiz_id, eleve_id, reponses, score)
    values ((select valeur from ids where cle = 'quiz'), '22222222-2222-2222-2222-222222222222', '[]', 50);
    raise exception 'C07 : tentative pour un autre élève';
  exception when insufficient_privilege or foreign_key_violation then null;
  end;
  insert into tentatives_quiz (quiz_id, eleve_id, reponses, score)
  values ((select valeur from ids where cle = 'quiz'), '11111111-1111-1111-1111-111111111111', '["A"]', 100);
  begin
    update tentatives_quiz set score = 0;
    raise exception 'C07 : score modifié';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from tentatives_quiz;
    raise exception 'C07 : score supprimé';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select pg_temp.agent(null, null);
set role authenticated;
do $$ begin
  assert (select count(*) from tentatives_quiz) = 1, 'C07 : l''élève ne voit pas sa tentative';
end $$;
reset role;
\echo OK C07 quiz brouillon caché aux élèves, score écrit une fois pour l élève du contexte

\echo TOUS LES TESTS DE CONTENUS SONT PASSÉS
