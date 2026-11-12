-- Chapitre « commencé » par la plateforme (décision D15 a ; ADR 0103). Après 77 : élève fictif 2222… actif,
-- chapitres validés f1 et f3. Progression et quiz FICTIFS, supprimés à la fin.
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

create function pg_temp.connecter(p_utilisateur text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_utilisateur, false)
$$;
delete from progression where eleve_id = '22222222-2222-2222-2222-222222222222';

-- PC01 Leçon ouverte : le chapitre passe « en cours » ; une seconde ouverture ne change rien.
select pg_temp.connecter('22222222-2222-2222-2222-222222222222');
set role authenticated;
do $$ begin
  perform noter_visionnage('00000000-0000-0000-0000-0000000000f1', 'lecon_ouverte', 60);
  perform noter_visionnage('00000000-0000-0000-0000-0000000000f1', 'lecon_ouverte', 60);
end $$;
reset role;
do $$ begin
  assert (select statut::text from progression where eleve_id = '22222222-2222-2222-2222-222222222222'
          and chapitre_id = '00000000-0000-0000-0000-0000000000f1') = 'en_cours', 'PC01 : en cours';
end $$;

-- PC02 Un chapitre terminé ne redevient jamais « en cours » ; une vidéo terminée seule ne marque rien.
update progression set statut = 'termine' where eleve_id = '22222222-2222-2222-2222-222222222222';
select pg_temp.connecter('22222222-2222-2222-2222-222222222222');
set role authenticated;
do $$ begin
  perform noter_visionnage('00000000-0000-0000-0000-0000000000f1', 'video_demarree', 60);
  perform noter_visionnage('00000000-0000-0000-0000-0000000000f3', 'video_terminee', 60);
end $$;
reset role;
do $$ begin
  assert (select statut::text from progression where eleve_id = '22222222-2222-2222-2222-222222222222'
          and chapitre_id = '00000000-0000-0000-0000-0000000000f1') = 'termine', 'PC02 : pas de retour';
  assert not exists (select 1 from progression where eleve_id = '22222222-2222-2222-2222-222222222222'
          and chapitre_id = '00000000-0000-0000-0000-0000000000f3'), 'PC02 : vidéo terminée seule';
end $$;

-- PC03 Quiz passé : son chapitre est « commencé », quel que soit le rôle qui enregistre la tentative.
insert into quiz (id, chapitre_id, version, questions, cree_par)
values ('00000000-0000-0000-0000-00000000c0e3', '00000000-0000-0000-0000-0000000000f3', 1,
        '[{"enonce": "Question fictive"}]', 'test');
insert into tentatives_quiz (quiz_id, eleve_id, reponses, score)
values ('00000000-0000-0000-0000-00000000c0e3', '22222222-2222-2222-2222-222222222222', '[]', 50);
do $$ begin
  assert (select statut::text from progression where eleve_id = '22222222-2222-2222-2222-222222222222'
          and chapitre_id = '00000000-0000-0000-0000-0000000000f3') = 'en_cours', 'PC03 : quiz passé';
end $$;

-- PC04 La fonction interne n'est appelable par personne d'autre que la base.
select pg_temp.connecter('22222222-2222-2222-2222-222222222222');
set role authenticated;
do $$ begin
  begin perform marquer_chapitre_commence('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-0000000000f1');
    raise exception 'PC04 : fonction interne appelée';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- PC05 (revue du Jalon 24, S13) Un chapitre validé d'un autre pays n'est ni noté « commencé » ni compté.
create temp table pc05 as
  select c.id, c.version, c.empreinte from chapitres c join unites u on u.id = c.unite_id
  where u.referentiel_id <> (select referentiel_id from eleves where id = '22222222-2222-2222-2222-222222222222')
    and c.statut <> 'valide'
  order by c.id limit 1;
insert into approbations (objet_type, objet_id, version, empreinte, decision, commentaire, valideur_id)
select 'chapitre', id, version, empreinte, 'valide', 'Test PC05 (fictif)',
       (select id from profils where role = 'referent' order by id limit 1)
from pc05;
update chapitres set statut = 'valide' where id = (select id from pc05);
grant select on pc05 to authenticated;
select pg_temp.connecter('22222222-2222-2222-2222-222222222222');
set role authenticated;
do $$ begin
  assert not noter_visionnage((select id from pc05), 'lecon_ouverte', 60), 'PC05 : refusé';
end $$;
reset role;
do $$ begin
  assert (select count(*) from pc05) = 1, 'PC05 : un chapitre d''un autre pays existe';
  assert not exists (select 1 from progression where eleve_id = '22222222-2222-2222-2222-222222222222'
          and chapitre_id = (select id from pc05)), 'PC05 : rien noté';
  assert not exists (select 1 from visionnages_jour where chapitre_id = (select id from pc05)), 'PC05 : rien compté';
end $$;
update chapitres set statut = 'a_valider' where id = (select id from pc05);
delete from approbations where objet_id = (select id from pc05) and commentaire = 'Test PC05 (fictif)';

delete from quiz where id = '00000000-0000-0000-0000-00000000c0e3';
delete from progression where eleve_id = '22222222-2222-2222-2222-222222222222';
\o
\echo 'Chapitre commencé par la plateforme : PC01-PC05 OK'
