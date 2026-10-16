-- Tests de l'agent Conformité programme (Jalon 4, étape 3). Après 40 (référent Maths 7777…) et 54 (élève 8888…01).
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

create function pg_temp.connecter(p_utilisateur text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_utilisateur, false)
$$;
create temp table ids (cle text primary key, valeur uuid);
grant select, insert on ids to public;
insert into ids select 'referentiel', id from referentiels where code = 'ga-general';
insert into ids select 'unite', id from unites where code = 'ga-3e-mathematiques';
create function pg_temp.agent(p_document uuid) returns void language sql as $$
  select set_config('app.eleve_id', '', false),
         set_config('app.referentiel_id', (select valeur::text from ids where cle = 'referentiel'), false),
         set_config('app.unite_id', (select valeur::text from ids where cle = 'unite'), false),
         set_config('app.document_id', coalesce(p_document::text, ''), false)
$$;

-- Z01 Dépôt : référent ou administration seulement ; PDF jamais relu par les utilisateurs.
select pg_temp.connecter('88888888-8888-4888-8888-888888888801');
set role authenticated;
do $$ begin
  begin
    perform deposer_document_officiel((select valeur from ids where cle = 'referentiel'), 'Programme', 'IPN', true, 'Texte', null);
    raise exception 'Z01 : dépôt par un élève';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select pg_temp.connecter('77777777-7777-4777-8777-777777777777');
set role authenticated;
do $$
declare v uuid;
begin
  begin
    perform deposer_document_officiel((select valeur from ids where cle = 'referentiel'), 'X', 'Y', true, 'a', '\x00');
    raise exception 'Z01 : texte et PDF ensemble';
  exception when invalid_parameter_value then null;
  end;
  v := deposer_document_officiel((select valeur from ids where cle = 'referentiel'), 'Programme fictif de 3e',
    'Document fictif de test', true, 'Chapitre 1 : Théorème de Thalès', null);
  insert into ids values ('document', v);
  insert into ids values ('pdf', deposer_document_officiel((select valeur from ids where cle = 'referentiel'),
    'PDF fictif', 'Test', false, null, '\x255044462d'));
  assert (select count(*) from documents_officiels) = 2, 'Z01 : documents invisibles pour le référent';
  begin
    perform pdf from documents_officiels;
    raise exception 'Z01 : PDF lisible par un utilisateur';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
do $$ begin
  assert (select empreinte = encode(sha256(convert_to('Chapitre 1 : Théorème de Thalès', 'UTF8')), 'hex')
          from documents_officiels where id = (select valeur from ids where cle = 'document')), 'Z01 : empreinte';
end $$;
\echo OK Z01 dépôt réservé aux référents et à l administration

-- Z02 L'agent : son seul document, aucune donnée d'élève, aucun droit d'écriture sur le référentiel.
select pg_temp.agent((select valeur from ids where cle = 'document'));
set role agent_conformite;
do $$ begin
  assert (select count(*) from documents_officiels) = 1, 'Z02 : autre document visible';
  assert (select texte from documents_officiels) like 'Chapitre 1%', 'Z02 : texte du document';
  begin perform 1 from eleves; raise exception 'Z02 : élèves lisibles';
  exception when insufficient_privilege then null; end;
  begin perform 1 from progression; raise exception 'Z02 : progression lisible';
  exception when insufficient_privilege then null; end;
  begin perform 1 from tentatives_quiz; raise exception 'Z02 : tentatives lisibles';
  exception when insufficient_privilege then null; end;
  begin update chapitres set titre = 'Modifié'; raise exception 'Z02 : référentiel modifiable';
  exception when insufficient_privilege then null; end;
  assert not exists (select 1 from scripts where statut <> 'valide'), 'Z02 : brouillon de script lisible';
  begin
    insert into rapports_conformite (referentiel_id, document_id, unite_id, contenu)
    values (contexte_agent('referentiel_id'), (select id from documents_officiels limit 1),
            (select id from unites where code = 'ga-4e-mathematiques'), '{}');
    raise exception 'Z02 : rapport pour une autre unité';
  exception when insufficient_privilege then null;
  end;
  insert into rapports_conformite (referentiel_id, document_id, unite_id, contenu)
  values (contexte_agent('referentiel_id'), contexte_agent('document_id'), contexte_agent('unite_id'), '{"synthese": "x"}');
end $$;
reset role;
\echo OK Z02 agent limité à son document, sans donnée d élève, sans écriture du référentiel

-- Z03 Rapport brouillon, lu et clos par un référent de la famille seulement.
do $$ begin
  assert (select statut = 'brouillon' and version = 1 from rapports_conformite), 'Z03 : statut ou version';
end $$;
select pg_temp.connecter('88888888-8888-4888-8888-888888888801');
set role authenticated;
do $$ begin
  assert (select count(*) from rapports_conformite) = 0, 'Z03 : rapport lisible par un élève';
  assert not clore_rapport_conformite((select id from rapports_conformite limit 1)), 'Z03 : clos par un élève';
end $$;
reset role;
select pg_temp.connecter('77777777-7777-4777-8777-777777777777');
set role authenticated;
do $$ begin
  assert (select count(*) from rapports_conformite) = 1, 'Z03 : rapport invisible pour le référent';
  assert clore_rapport_conformite((select id from rapports_conformite)), 'Z03 : clôture';
end $$;
reset role;
do $$ begin assert (select statut from rapports_conformite) = 'traite', 'Z03 : statut'; end $$;
\echo OK Z03 rapports brouillons réservés aux référents de la famille

\echo TOUS LES TESTS DE LA CONFORMITÉ SONT PASSÉS
