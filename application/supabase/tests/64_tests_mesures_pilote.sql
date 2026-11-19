-- Mesures du pilote (Jalon 6, étape 5 ; ADR 0052). Après 48 (administrateur 5555…) et l'import des packs
-- (questionnaire FICTIF validé du pays « zz », questionnaire du Gabon encore à valider).
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

create function pg_temp.connecter(p_utilisateur text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_utilisateur, false)
$$;

-- Q01 Compteur : chapitre validé seulement, quota par élève et par jour, aucune trace de l'élève.
select pg_temp.connecter('11111111-1111-1111-1111-111111111111');
set role authenticated;
do $$ begin
  assert noter_visionnage('00000000-0000-0000-0000-0000000000f1', 'video_demarree', 3), 'Q01 : démarrage';
  assert noter_visionnage('00000000-0000-0000-0000-0000000000f1', 'lecon_ouverte', 3), 'Q01 : leçon';
  assert not noter_visionnage('00000000-0000-0000-0000-0000000000f2', 'video_demarree', 3), 'Q01 : chapitre non validé';
  assert noter_visionnage('00000000-0000-0000-0000-0000000000f1', 'video_terminee', 3), 'Q01 : fin';
  assert not noter_visionnage('00000000-0000-0000-0000-0000000000f1', 'video_terminee', 3), 'Q01 : quota';
  begin perform noter_visionnage('00000000-0000-0000-0000-0000000000f1', 'autre', 3); raise exception 'Q01 : événement inconnu';
  exception when invalid_parameter_value then null; end;
  begin perform 1 from visionnages_jour; raise exception 'Q01 : compteur lisible par un élève';
  exception when insufficient_privilege then null; end;
  begin perform visionnages_par_chapitre(30); raise exception 'Q01 : totaux lus par un élève';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  assert (select videos_demarrees + videos_terminees + lecons_ouvertes from visionnages_jour
          where chapitre_id = '00000000-0000-0000-0000-0000000000f1') = 3, 'Q01 : cumul';
  assert not exists (select 1 from information_schema.columns where table_name = 'visionnages_jour'
                     and column_name like '%eleve%'), 'Q01 : colonne d''élève';
end $$;
select pg_temp.connecter('55555555-5555-4555-8555-555555555555');
set role authenticated;
do $$ begin
  assert (select videos_demarrees from visionnages_par_chapitre(30) where unite = 'xx-n4-maths' and chapitre = 'c1') = 1,
    'Q01 : totaux de l''administration';
end $$;
reset role;
\echo OK Q01 compteur de visionnage agrégé

-- Élève fictif du pays « zz » (questionnaire validé).
insert into auth.users (id) values ('64646464-6464-4464-8464-646464646401');
select pg_temp.connecter('64646464-6464-4464-8464-646464646401');
set role authenticated;
select inscrire_eleve('Élève Q', 'zz-general', 'an3', null, false, null);
reset role;

-- Q02 Élève : questions de son public ; réponses complètes et permises seulement ; une seule fois ; rien ne le relie.
set role authenticated;
do $$
declare q jsonb := questionnaire_pour_eleve();
begin
  assert jsonb_array_length(q -> 'questions') = 2, 'Q02 : questions des élèves seulement';
  begin perform repondre_questionnaire_eleve('{"e1": "4"}'); raise exception 'Q02 : réponse incomplète';
  exception when invalid_parameter_value then null; end;
  begin perform repondre_questionnaire_eleve('{"e1": "9", "e2": "Option A"}'); raise exception 'Q02 : valeur hors échelle';
  exception when invalid_parameter_value then null; end;
  begin perform repondre_questionnaire_eleve('{"e1": "4", "e2": "Option A", "nom": "x"}'); raise exception 'Q02 : champ en plus';
  exception when invalid_parameter_value then null; end;
  assert repondre_questionnaire_eleve('{"e1": "4", "e2": "Option A"}'), 'Q02 : réponse';
  assert not repondre_questionnaire_eleve('{"e1": "5", "e2": "Option B"}'), 'Q02 : deuxième réponse';
  assert questionnaire_pour_eleve() is null, 'Q02 : questionnaire encore proposé';
  begin perform 1 from reponses_questionnaire; raise exception 'Q02 : réponses lisibles';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  assert (select count(*) from reponses_questionnaire) = 1, 'Q02 : une réponse';
  assert not exists (select 1 from reponses_questionnaire where reponses::text like '%6464%'), 'Q02 : identifiant';
  assert not exists (select 1 from information_schema.columns where table_name = 'reponses_questionnaire'
                     and column_name in ('eleve_id', 'utilisateur', 'cree_le')), 'Q02 : colonne identifiante';
  assert not exists (select 1 from questionnaires_remplis where empreinte like '%6464%'), 'Q02 : compte en clair';
  -- Questionnaire du pilote encore à valider : montré à personne.
  assert not exists (select 1 from questionnaire_ouvert((select id from referentiels where code = 'ga-general'), 'eleve')),
    'Q02 : questionnaire non validé ouvert';
end $$;
\echo OK Q02 questionnaire anonyme des élèves

-- Q03 Parent, depuis le lien d'un rapport : une fois par accord ; lien inconnu refusé.
insert into consentements (eleve_id, type, contact_parent, accorde_le)
values ('64646464-6464-4464-8464-646464646401', 'rapport_parents', 'parent@exemple.invalid', now());
insert into rapports_parents (eleve_id, consentement_id, periode, contenu, statut, empreinte_jeton, envoye_le)
select '64646464-6464-4464-8464-646464646401', id, 'hebdomadaire', '{}', 'envoye', empreinte_jeton('jeton-fictif-q03'), now()
from consentements where eleve_id = '64646464-6464-4464-8464-646464646401' and type = 'rapport_parents';
select pg_temp.connecter('');
set role anon;
do $$ begin
  assert jsonb_array_length(questionnaire_pour_parent('jeton-fictif-q03') -> 'questions') = 1, 'Q03 : questions des parents';
  assert questionnaire_pour_parent('jeton-inconnu') is null, 'Q03 : jeton inconnu';
  begin perform repondre_questionnaire_parent('jeton-inconnu', '{"p1": "3"}'); raise exception 'Q03 : jeton inconnu accepté';
  exception when insufficient_privilege then null; end;
  assert repondre_questionnaire_parent('jeton-fictif-q03', '{"p1": "3"}'), 'Q03 : réponse du parent';
  assert not repondre_questionnaire_parent('jeton-fictif-q03', '{"p1": "2"}'), 'Q03 : deuxième réponse';
  assert questionnaire_pour_parent('jeton-fictif-q03') is null, 'Q03 : encore proposé';
end $$;
reset role;
\echo OK Q03 questionnaire anonyme des parents

-- Q04 Version répondue figée ; résultats à l'administration seulement.
do $$ begin
  begin update questionnaires set questions = '[]' where version = 'fictif-1'; raise exception 'Q04 : version répondue modifiée';
  exception when insufficient_privilege then null; end;
end $$;
select pg_temp.connecter('55555555-5555-4555-8555-555555555555');
set role authenticated;
do $$ begin
  assert (select nombre from resultats_questionnaires() where public = 'eleve' and question = 'e2' and option = 'Option A') = 1,
    'Q04 : résultats';
  assert (select max(total) from resultats_questionnaires() where public = 'parent') = 1, 'Q04 : total des parents';
end $$;
reset role;
select pg_temp.connecter('64646464-6464-4464-8464-646464646401');
set role authenticated;
do $$ begin
  begin perform resultats_questionnaires(); raise exception 'Q04 : résultats lus par un élève';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
delete from auth.users where id = '64646464-6464-4464-8464-646464646401';
\echo OK Q04 version figée, résultats réservés

\o
\echo TOUS LES TESTS DES MESURES DU PILOTE SONT PASSÉS
