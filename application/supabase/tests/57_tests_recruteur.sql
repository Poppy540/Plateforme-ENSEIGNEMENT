-- Tests de l'agent Recruteur (Jalon 4, étape 4). Après 48 (administrateur 5555…) et 40 (référent 7777…).
-- Données FICTIVES : contacts en .invalid (RFC 2606), jamais de vraie personne.
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

create function pg_temp.connecter(p_utilisateur text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_utilisateur, false)
$$;
-- Sel de la liste d'opposition (D4), transmis par le serveur en temps normal : valeur FICTIVE de test.
select set_config('app.sel_opposition', 'sel-fictif-de-test-de-la-base-0000', false);
create temp table ids (cle text primary key, valeur uuid);
grant select, insert on ids to public;
insert into ids select 'referentiel', id from referentiels where code = 'ga-general';
create function pg_temp.agent(p_candidat uuid) returns void language sql as $$
  select set_config('app.candidat_id', coalesce(p_candidat::text, ''), false)
$$;

-- N01 Fiches : seul le propriétaire crée et lit ; un référent ou un élève ne voit rien.
select pg_temp.connecter('55555555-5555-4555-8555-555555555555');
set role authenticated;
do $$
declare v uuid;
begin
  insert into candidats (referentiel_id, nom, famille, niveau, structure, contact, source, cree_par)
  values ((select valeur from ids where cle = 'referentiel'), 'Candidate Fictive A', 'mathematiques', 'collège',
          'Lycée fictif', 'a@exemple.invalid', 'recommandation', auth.uid())
  returning id into v;
  insert into ids values ('a', v);
  insert into candidats (referentiel_id, nom, famille, contact, source, cree_par)
  values ((select valeur from ids where cle = 'referentiel'), 'Candidat Fictif B', 'mathematiques',
          'b@exemple.invalid', 'candidature_spontanee', auth.uid())
  returning id into v;
  insert into ids values ('b', v);
  assert (select count(*) from candidats) = 2, 'N01 : fiches invisibles pour le propriétaire';
  assert (select statut from candidats where id = v) = 'identifie', 'N01 : statut initial';
end $$;
reset role;
select pg_temp.connecter('77777777-7777-4777-8777-777777777777');
set role authenticated;
do $$ begin
  assert (select count(*) from candidats) = 0, 'N01 : fiches visibles par un référent';
  begin
    insert into candidats (referentiel_id, nom, famille, contact, source, cree_par)
    values ((select valeur from ids where cle = 'referentiel'), 'X', 'mathematiques', 'x@exemple.invalid', 'recommandation', auth.uid());
    raise exception 'N01 : fiche créée par un référent';
  exception when insufficient_privilege then null;
  end;
  begin perform 1 from liste_opposition; raise exception 'N01 : liste d opposition lisible';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
\echo OK N01 fiches réservées au propriétaire

-- N02 L'agent : son seul candidat, pas le contact, pas « signé », pas d'approbation ni d'envoi.
select pg_temp.agent((select valeur from ids where cle = 'a'));
set role agent_recruteur;
do $$ begin
  assert (select count(*) from candidats) = 1, 'N02 : autre candidat visible';
  begin perform contact from candidats; raise exception 'N02 : contact lisible par l agent';
  exception when insufficient_privilege then null; end;
  update candidats set adequation = 'forte', justification = 'Enseigne les mathématiques au collège.',
    points_a_verifier = array['disponibilité'], statut = 'qualifie', maj_le = now();
  assert (select statut from candidats) = 'qualifie', 'N02 : qualification';
  begin
    update candidats set statut = 'signe';
    raise exception 'N02 : accord marqué signé par l agent';
  exception when insufficient_privilege then null;
  end;
  update candidats set statut = 'qualifie' where id = (select valeur from ids where cle = 'b');
  insert into messages_recrutement (candidat_id, nature, objet, texte)
  values ((select valeur from ids where cle = 'a'), 'premier_contact', 'Proposition fictive',
          'Bonjour, message rédigé avec une intelligence artificielle. Répondez STOP pour ne plus être contactée.');
  begin
    insert into messages_recrutement (candidat_id, nature, objet, texte)
    values ((select valeur from ids where cle = 'b'), 'premier_contact', 'X', 'Y');
    raise exception 'N02 : brouillon pour un autre candidat';
  exception when insufficient_privilege then null;
  end;
  begin
    perform approuver_message_recrutement((select id from messages_recrutement limit 1), 'x');
    raise exception 'N02 : approbation par l agent';
  exception when insufficient_privilege then null;
  end;
  begin
    perform envoyer_message_recrutement((select id from messages_recrutement limit 1), 7);
    raise exception 'N02 : envoi par l agent';
  exception when insufficient_privilege then null;
  end;
  begin perform 1 from eleves; raise exception 'N02 : élèves lisibles';
  exception when insufficient_privilege then null; end;
  insert into dossiers_accord (candidat_id, resume, consentement_image_voix_separe)
  values ((select valeur from ids where cle = 'a'), 'Résumé fictif', true);
  begin
    insert into dossiers_accord (candidat_id, resume, consentement_image_voix_separe)
    values ((select valeur from ids where cle = 'b'), 'X', true);
    raise exception 'N02 : dossier pour un autre candidat';
  exception when insufficient_privilege then null;
  end;
  insert into signalements (source, motif, priorite, resume) values ('agent_recruteur', 'autre', 3, 'Source douteuse (test)');
end $$;
reset role;
do $$ begin
  assert (select statut from candidats where id = (select valeur from ids where cle = 'b')) = 'identifie',
    'N02 : autre candidat modifié';
  assert (select statut from messages_recrutement) = 'brouillon', 'N02 : statut initial du message';
end $$;
\echo OK N02 agent limité à son candidat et aux brouillons

-- N03 Le texte est figé ; l'approbation vérifie l'empreinte ; un texte modifié est un nouveau brouillon.
insert into ids select 'm1', id from messages_recrutement;
do $$ begin
  begin
    update messages_recrutement set texte = 'Texte changé';
    raise exception 'N03 : texte modifiable';
  exception when insufficient_privilege then null;
  end;
end $$;
select pg_temp.connecter('55555555-5555-4555-8555-555555555555');
set role authenticated;
do $$ begin
  assert not approuver_message_recrutement((select valeur from ids where cle = 'm1'), 'empreinte-fausse'),
    'N03 : approbation avec une mauvaise empreinte';
  assert approuver_message_recrutement((select valeur from ids where cle = 'm1'),
    (select empreinte from messages_recrutement where id = (select valeur from ids where cle = 'm1'))),
    'N03 : approbation refusée';
  assert (select approuve_par from messages_recrutement where id = (select valeur from ids where cle = 'm1'))
    = '55555555-5555-4555-8555-555555555555', 'N03 : valideur non enregistré';
  begin
    update messages_recrutement set statut = 'envoye';
    raise exception 'N03 : envoi direct par mise à jour';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select pg_temp.connecter('77777777-7777-4777-8777-777777777777');
set role authenticated;
do $$ begin
  begin
    perform approuver_message_recrutement((select valeur from ids where cle = 'm1'), 'x');
    raise exception 'N03 : approbation par un référent';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
\echo OK N03 texte figé et approbation par empreinte

-- N04 Envoi : service de messagerie seulement, message approuvé, un seul premier contact.
set role service_messagerie;
do $$
declare r record;
begin
  select * into r from envoyer_message_recrutement((select valeur from ids where cle = 'm1'), 7);
  assert r.contact = 'a@exemple.invalid', 'N04 : contact renvoyé';
  assert r.texte like 'Bonjour%', 'N04 : texte renvoyé';
  begin
    perform envoyer_message_recrutement((select valeur from ids where cle = 'm1'), 7);
    raise exception 'N04 : double envoi';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
do $$ begin
  assert (select statut from candidats where id = (select valeur from ids where cle = 'a')) = 'contacte',
    'N04 : statut après envoi';
end $$;
-- Un brouillon non approuvé ne part pas.
select pg_temp.agent((select valeur from ids where cle = 'a'));
set role agent_recruteur;
insert into messages_recrutement (candidat_id, nature, objet, texte)
values ((select valeur from ids where cle = 'a'), 'relance', 'Relance fictive', 'Petite relance. Répondez STOP pour ne plus être contactée.');
insert into messages_recrutement (candidat_id, nature, objet, texte)
values ((select valeur from ids where cle = 'a'), 'premier_contact', 'Second premier contact', 'Encore. STOP pour refuser.');
reset role;
insert into ids select 'relance', id from messages_recrutement where nature = 'relance';
insert into ids select 'second', id from messages_recrutement where objet = 'Second premier contact';
set role service_messagerie;
do $$ begin
  begin
    perform envoyer_message_recrutement((select valeur from ids where cle = 'relance'), 7);
    raise exception 'N04 : brouillon envoyé';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select pg_temp.connecter('55555555-5555-4555-8555-555555555555');
set role authenticated;
select approuver_message_recrutement(m.id, m.empreinte) from messages_recrutement m
where m.id in ((select valeur from ids where cle = 'relance'), (select valeur from ids where cle = 'second'));
reset role;
set role service_messagerie;
do $$ begin
  begin
    perform envoyer_message_recrutement((select valeur from ids where cle = 'second'), 7);
    raise exception 'N04 : second premier contact envoyé';
  exception when invalid_parameter_value then null;
  end;
end $$;
reset role;
select pg_temp.connecter('55555555-5555-4555-8555-555555555555');
set role authenticated;
do $$ begin
  assert annuler_message_recrutement((select valeur from ids where cle = 'second')), 'N04 : annulation';
  assert not annuler_message_recrutement((select valeur from ids where cle = 'm1')), 'N04 : message envoyé annulé';
end $$;
reset role;
\echo OK N04 envoi approuvé seulement, un seul premier contact, annulation

-- N05 Une seule relance, après le délai.
set role service_messagerie;
do $$ begin
  begin
    perform envoyer_message_recrutement((select valeur from ids where cle = 'relance'), 7);
    raise exception 'N05 : relance avant le délai';
  exception when invalid_parameter_value then null;
  end;
end $$;
reset role;
alter table messages_recrutement disable trigger messages_recrutement_versionnes;
update messages_recrutement set envoye_le = now() - interval '8 days' where id = (select valeur from ids where cle = 'm1');
alter table messages_recrutement enable trigger messages_recrutement_versionnes;
set role service_messagerie;
select envoyer_message_recrutement((select valeur from ids where cle = 'relance'), 7);
reset role;
do $$ begin
  assert (select statut from candidats where id = (select valeur from ids where cle = 'a')) = 'relance',
    'N05 : statut après relance';
end $$;
select pg_temp.agent((select valeur from ids where cle = 'a'));
set role agent_recruteur;
insert into messages_recrutement (candidat_id, nature, objet, texte)
values ((select valeur from ids where cle = 'a'), 'relance', 'Deuxième relance', 'Non. STOP pour refuser.');
reset role;
insert into ids select 'relance2', id from messages_recrutement where objet = 'Deuxième relance';
select pg_temp.connecter('55555555-5555-4555-8555-555555555555');
set role authenticated;
select approuver_message_recrutement(m.id, m.empreinte) from messages_recrutement m
where m.id = (select valeur from ids where cle = 'relance2');
reset role;
set role service_messagerie;
do $$ begin
  begin
    perform envoyer_message_recrutement((select valeur from ids where cle = 'relance2'), 7);
    raise exception 'N05 : seconde relance';
  exception when invalid_parameter_value then null;
  end;
end $$;
reset role;
\echo OK N05 une seule relance après le délai

-- N06 Refus : opposition enregistrée, messages annulés, plus aucun envoi ni nouvelle fiche.
select pg_temp.agent((select valeur from ids where cle = 'a'));
set role agent_recruteur;
select enregistrer_opposition('refus');
do $$ begin
  begin
    update candidats set statut = 'qualifie';
    assert (select statut from candidats) = 'refus', 'N06 : refus effacé par l agent';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
do $$ begin
  assert (select statut from candidats where id = (select valeur from ids where cle = 'a')) = 'refus', 'N06 : statut';
  assert (select statut from messages_recrutement where id = (select valeur from ids where cle = 'relance2')) = 'annule',
    'N06 : message approuvé non annulé';
  assert dans_opposition(' A@Exemple.invalid '), 'N06 : opposition (casse, espaces)';
  assert (select count(*) from liste_opposition) = 1, 'N06 : opposition non enregistrée';
end $$;
select pg_temp.connecter('55555555-5555-4555-8555-555555555555');
set role authenticated;
do $$ begin
  begin
    insert into candidats (referentiel_id, nom, famille, contact, source, cree_par)
    values ((select valeur from ids where cle = 'referentiel'), 'Retour', 'mathematiques', 'a@exemple.invalid',
            'recommandation', auth.uid());
    raise exception 'N06 : fiche recréée après refus';
  exception when check_violation then null;
  end;
end $$;
reset role;
-- Opposition arrivée après l'approbation : vérifiée juste avant l'envoi.
select pg_temp.agent((select valeur from ids where cle = 'b'));
set role agent_recruteur;
insert into messages_recrutement (candidat_id, nature, objet, texte)
values ((select valeur from ids where cle = 'b'), 'premier_contact', 'Pour B', 'Bonjour. STOP pour refuser.');
reset role;
insert into ids select 'mb', id from messages_recrutement where objet = 'Pour B';
select pg_temp.connecter('55555555-5555-4555-8555-555555555555');
set role authenticated;
select approuver_message_recrutement(m.id, m.empreinte) from messages_recrutement m
where m.id = (select valeur from ids where cle = 'mb');
reset role;
insert into liste_opposition (empreinte, motif) values (empreinte_contact('b@exemple.invalid'), 'refus');
set role service_messagerie;
do $$ begin
  begin
    perform envoyer_message_recrutement((select valeur from ids where cle = 'mb'), 7);
    raise exception 'N06 : envoi à une personne opposée';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
\echo OK N06 refus et liste d opposition vérifiée avant l envoi

-- N07 Suppression par le propriétaire : fiche et messages effacés, opposition gardée (empreinte seule).
select pg_temp.connecter('77777777-7777-4777-8777-777777777777');
set role authenticated;
do $$ begin
  begin
    perform supprimer_candidat((select valeur from ids where cle = 'b'));
    raise exception 'N07 : suppression par un référent';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select pg_temp.connecter('55555555-5555-4555-8555-555555555555');
set role authenticated;
select supprimer_candidat((select valeur from ids where cle = 'b'));
reset role;
do $$ begin
  assert not exists (select 1 from candidats where id = (select valeur from ids where cle = 'b')), 'N07 : fiche restante';
  assert not exists (select 1 from messages_recrutement where id = (select valeur from ids where cle = 'mb')),
    'N07 : messages restants';
  assert dans_opposition('b@exemple.invalid'), 'N07 : opposition perdue';
  assert not exists (select 1 from liste_opposition where empreinte like '%@%'), 'N07 : contact en clair';
end $$;
\echo OK N07 suppression avec opposition conservée

-- Nettoyage : les tests suivants partent d'un pipeline vide.
delete from candidats;
delete from liste_opposition;
