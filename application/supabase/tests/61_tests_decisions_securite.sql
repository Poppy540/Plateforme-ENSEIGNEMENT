-- Décisions de la revue de sécurité (Jalon 6, étape 1 ; ADR 0049). Après 48 (administrateur 5555…) et 58 (pack « zz »).
-- Données FICTIVES uniquement (contacts en .invalid, indicatif +999 non attribué).
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

create function pg_temp.connecter(p_utilisateur text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_utilisateur, false)
$$;
create temp table ids (cle text primary key, valeur uuid);
grant select, insert on ids to public;

-- D01 Sessions : ouvertes par la personne connectée, lues par identifiant seulement, révocables.
select pg_temp.connecter('11111111-1111-1111-1111-111111111111');
set role authenticated;
insert into ids values ('session_a', ouvrir_session(24)), ('session_a2', ouvrir_session(100000));
do $$ begin
  begin perform 1 from sessions_ouvertes; raise exception 'D01 : table des sessions lisible';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  assert (select expire_le from sessions_ouvertes where id = (select valeur from ids where cle = 'session_a2'))
    <= now() + interval '720 hours', 'D01 : durée au-delà de 30 jours';
end $$;
select pg_temp.connecter('');
set role anon;
do $$ begin
  assert (select role from session_active((select valeur from ids where cle = 'session_a'))) = 'eleve', 'D01 : session active';
  assert not exists (select 1 from session_active(gen_random_uuid())), 'D01 : session inventée';
  begin perform ouvrir_session(1); raise exception 'D01 : session ouverte sans connexion';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
-- Un autre compte ne révoque pas la session ; la personne, si.
select pg_temp.connecter('22222222-2222-2222-2222-222222222222');
set role authenticated;
do $$ begin
  assert not revoquer_session((select valeur from ids where cle = 'session_a')), 'D01 : session d''autrui révoquée';
  begin perform revoquer_toutes_les_sessions(null); raise exception 'D01 : révocation générale par un élève';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select pg_temp.connecter('11111111-1111-1111-1111-111111111111');
set role authenticated;
do $$ begin
  assert revoquer_session((select valeur from ids where cle = 'session_a')), 'D01 : déconnexion';
  assert revoquer_mes_sessions() = 1, 'D01 : tous mes appareils';
end $$;
insert into ids values ('session_b', ouvrir_session(24));
reset role;
do $$ begin
  assert not exists (select 1 from session_active((select valeur from ids where cle = 'session_a'))), 'D01 : session révoquée encore active';
  assert not exists (select 1 from session_active((select valeur from ids where cle = 'session_a2'))), 'D01 : session d''un autre appareil active';
end $$;
-- Incident : l'administration ferme tout, sauf sa propre session.
select pg_temp.connecter('55555555-5555-4555-8555-555555555555');
set role authenticated;
insert into ids values ('session_admin', ouvrir_session(12));
do $$ begin
  assert revoquer_toutes_les_sessions((select valeur from ids where cle = 'session_admin')) >= 1, 'D01 : révocation générale';
end $$;
reset role;
do $$ begin
  assert exists (select 1 from session_active((select valeur from ids where cle = 'session_admin'))), 'D01 : session de l''administration fermée';
  assert not exists (select 1 from session_active((select valeur from ids where cle = 'session_b'))), 'D01 : session d''élève restée ouverte';
end $$;
\echo OK D01 sessions révocables

-- D02 Liste d'opposition : empreinte salée, refusée sans sel ; anciennes empreintes sans sel reconnues.
select set_config('app.sel_opposition', '', false);
do $$ begin
  begin perform empreinte_contact('x@exemple.invalid'); raise exception 'D02 : empreinte sans sel';
  exception when object_not_in_prerequisite_state then null; end;
end $$;
select set_config('app.sel_opposition', 'sel-fictif-de-test-de-la-base-0001', false);
insert into liste_opposition (empreinte, motif, salee)
values (empreinte_contact_sans_sel('ancien@exemple.invalid'), 'refus', false),
       (empreinte_contact('nouveau@exemple.invalid'), 'refus', true);
do $$ begin
  assert dans_opposition(' Ancien@Exemple.invalid'), 'D02 : ancienne opposition perdue';
  assert dans_opposition('nouveau@exemple.invalid'), 'D02 : nouvelle opposition';
  assert empreinte_contact('nouveau@exemple.invalid') <> empreinte_contact_sans_sel('nouveau@exemple.invalid'), 'D02 : empreinte non salée';
end $$;
select set_config('app.sel_opposition', 'un-autre-sel-fictif-de-test-0002', false);
do $$ begin
  assert not dans_opposition('nouveau@exemple.invalid'), 'D02 : le sel ne change rien';
end $$;
select set_config('app.sel_opposition', 'sel-fictif-de-test-de-la-base-0001', false);
delete from liste_opposition where motif = 'refus' and inscrit_le > now() - interval '1 minute';
\echo OK D02 liste d opposition salée

-- D03 Indicatifs : ceux des packs importés, lisibles sans connexion ; format vérifié par la base.
set role anon;
do $$ begin
  assert '+999' = any (indicatifs_autorises()), 'D03 : indicatif du pack zz';
  assert array_length(indicatifs_autorises(), 1) >= 2, 'D03 : indicatif du pack pilote';
end $$;
reset role;
do $$ begin
  begin update pays set indicatifs_telephone = array['999'] where code = 'zz'; raise exception 'D03 : indicatif invalide accepté';
  exception when check_violation then null; end;
end $$;
\echo OK D03 indicatifs autorisés

-- D04 Référents : approbations de leurs familles (et les leurs) seulement ; plus aucun signalement.
insert into approbations (objet_type, objet_id, version, empreinte, decision, valideur_id) values
  ('chapitre', '00000000-0000-0000-0000-0000000000f3', 99, 'e-histoire', 'valide', '44444444-4444-4444-4444-444444444444'),
  ('chapitre', '00000000-0000-0000-0000-0000000000f1', 99, 'e-maths', 'valide', '33333333-3333-3333-3333-333333333333');
select pg_temp.connecter('33333333-3333-3333-3333-333333333333');
set role authenticated;
do $$ begin
  assert exists (select 1 from approbations where empreinte = 'e-maths'), 'D04 : approbation de sa famille';
  assert not exists (select 1 from approbations where empreinte = 'e-histoire'), 'D04 : approbation d''une autre famille';
  assert not exists (select 1 from signalements), 'D04 : signalement lu par un référent';
end $$;
reset role;
delete from approbations where version = 99;
\echo OK D04 lecture des référents limitée

-- D05 Documents officiels : suppression par le propriétaire seulement, tracée, rapports compris.
insert into documents_officiels (id, referentiel_id, titre, origine, format, texte, empreinte, depose_par)
values ('61616161-6161-4161-8161-616161616101', '00000000-0000-0000-0000-0000000000a1', 'Document fictif',
        'Test', 'texte', 'Texte fictif', 'e', '33333333-3333-3333-3333-333333333333');
select pg_temp.connecter('33333333-3333-3333-3333-333333333333');
set role authenticated;
do $$ begin
  begin perform supprimer_document_officiel('61616161-6161-4161-8161-616161616101', 'x');
    raise exception 'D05 : suppression par un référent';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select pg_temp.connecter('55555555-5555-4555-8555-555555555555');
set role authenticated;
do $$ begin
  assert supprimer_document_officiel('61616161-6161-4161-8161-616161616101', 'empreinte-fictive'), 'D05 : suppression';
  assert not supprimer_document_officiel('61616161-6161-4161-8161-616161616101', 'empreinte-fictive'), 'D05 : deux fois';
end $$;
reset role;
do $$ begin
  assert not exists (select 1 from documents_officiels where id = '61616161-6161-4161-8161-616161616101'), 'D05 : document resté';
  assert exists (select 1 from journal_audit where action = 'suppression_document_officiel'
                   and objet_id = '61616161-6161-4161-8161-616161616101'), 'D05 : suppression non tracée';
end $$;
\echo OK D05 suppression d un document officiel

-- D06 Résumés à la suppression d'un compte : effacés si le pack le demande, gardés sinon (pays xx).
create temp table conservation_zz as select conservation from pays where code = 'zz';
update pays set conservation = conservation || '{"resumes_apres_suppression": "effacer"}' where code = 'zz';
insert into auth.users (id) values ('61616161-6161-4161-8161-616161616102');
select pg_temp.connecter('61616161-6161-4161-8161-616161616102');
set role authenticated;
select inscrire_eleve('Élève Z', 'zz-general', 'an3', null, false, null);
reset role;
insert into signalements (source, motif, priorite, eleve_id, resume)
values ('agent_professeur', 'autre', 3, '61616161-6161-4161-8161-616161616102', 'Résumé fictif Z');
insert into tickets_support (demandeur_id, categorie, priorite, resume)
values ('61616161-6161-4161-8161-616161616102', 'connexion', 3, 'Ticket fictif Z');
insert into auth.users (id) values ('61616161-6161-4161-8161-616161616103');
insert into profils (id, role, prenom_ou_pseudo) values ('61616161-6161-4161-8161-616161616103', 'eleve', 'Élève X');
insert into eleves (id, referentiel_id, niveau_id, est_mineur, statut)
values ('61616161-6161-4161-8161-616161616103', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1', false, 'actif');
insert into signalements (source, motif, priorite, eleve_id, resume)
values ('agent_professeur', 'autre', 3, '61616161-6161-4161-8161-616161616103', 'Résumé fictif X');
do $$ begin
  assert (select pays_code from signalements where resume = 'Résumé fictif Z') = 'zz', 'D06 : pays du signalement';
  assert (select pays_code from tickets_support where resume = 'Ticket fictif Z') = 'zz', 'D06 : pays du ticket';
end $$;
delete from auth.users where id = '61616161-6161-4161-8161-616161616102';
delete from auth.users where id = '61616161-6161-4161-8161-616161616103';
do $$ begin
  assert not exists (select 1 from signalements where resume = 'Résumé fictif Z'), 'D06 : résumé gardé malgré « effacer »';
  assert exists (select 1 from signalements where pays_code = 'zz' and eleve_id is null
                   and resume = '(résumé effacé à la suppression du compte)'), 'D06 : signalement perdu';
  assert exists (select 1 from tickets_support where pays_code = 'zz' and demandeur_id is null
                   and resume = '(résumé effacé à la suppression du compte)'), 'D06 : ticket non effacé';
  assert exists (select 1 from signalements where resume = 'Résumé fictif X' and eleve_id is null), 'D06 : pays sans « effacer »';
end $$;
\echo OK D06 résumés à la suppression d un compte

-- D07 Purge étendue : seulement les catégories dont le pack fixe la durée ; rien de non traité.
update pays set conservation = conservation
  || '{"signalements_traites_jours": 30, "tickets_resolus_jours": 30, "recrutement_clos_jours": 30}' where code = 'zz';
update signalements set traite_le = now() - interval '40 days' where pays_code = 'zz';
insert into signalements (source, motif, priorite, chapitre_id, resume)
select 'agent_professeur', 'erreur_contenu', 3, c.id, 'Non traité fictif'
from chapitres c join unites u on u.id = c.unite_id join referentiels r on r.id = u.referentiel_id
where r.code = 'zz-general' limit 1;
update signalements set cree_le = now() - interval '400 days' where resume = 'Non traité fictif';
update tickets_support set statut = 'resolu', traite_le = now() - interval '40 days' where pays_code = 'zz';
insert into candidats (referentiel_id, nom, famille, contact, source)
select id, 'Candidat fictif clos', 'mathematiques', 'clos@exemple.invalid', 'recommandation' from referentiels where code = 'zz-general';
update candidats set statut = 'refus', maj_le = now() - interval '40 days' where nom = 'Candidat fictif clos';
insert into sessions_ouvertes (utilisateur, cree_le, expire_le)
values ('11111111-1111-1111-1111-111111111111', now() - interval '40 days', now() - interval '10 days');
create temp table purge as select * from purger_donnees_etendues('zz');
do $$ begin
  assert (select nombre from purge where categorie = 'signalements traités') = 1, 'D07 : signalements';
  assert (select nombre from purge where categorie = 'tickets résolus') = 1, 'D07 : tickets';
  assert (select nombre from purge where categorie = 'candidats clos') = 1, 'D07 : candidats';
  assert not exists (select 1 from purge where categorie = 'rapports aux parents'), 'D07 : durée non fixée appliquée';
  assert (select nombre from purge where categorie = 'sessions closes') >= 1, 'D07 : sessions';
  assert exists (select 1 from signalements where resume = 'Non traité fictif'), 'D07 : signalement non traité effacé';
  assert exists (select 1 from signalements where resume = 'Résumé fictif X'), 'D07 : autre pays touché';
end $$;
update pays set conservation = (select conservation from conservation_zz) where code = 'zz';
delete from signalements where resume = 'Non traité fictif';
\echo OK D07 purge étendue

\o
\echo TOUS LES TESTS DES DÉCISIONS DE SÉCURITÉ SONT PASSÉS
