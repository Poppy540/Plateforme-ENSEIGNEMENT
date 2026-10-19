-- Tests des règles d'accès. Chaque bloc échoue (et arrête le script) si une règle est violée.
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

create function pg_temp.connecter(p_utilisateur text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_utilisateur, false)
$$;

-- T01 Un élève ne lit que sa propre progression et son propre profil.
select pg_temp.connecter('11111111-1111-1111-1111-111111111111');
set role authenticated;
do $$ begin
  assert (select count(*) from progression) = 1, 'T01 : l''élève A voit la progression d''un autre élève';
  assert (select count(*) from eleves) = 1, 'T01 : l''élève A voit un autre élève';
  assert (select count(*) from profils) = 1, 'T01 : l''élève A voit un autre profil';
end $$;
reset role;
\echo OK T01 progression et profils personnels

-- T02 Un élève ne voit que les chapitres validés.
select pg_temp.connecter('11111111-1111-1111-1111-111111111111');
set role authenticated;
do $$ begin
  assert (select count(*) from chapitres) = 2, 'T02 : un élève voit un chapitre non validé';
  assert not exists (select 1 from chapitres where statut <> 'valide'), 'T02 : chapitre non validé visible';
end $$;
reset role;
\echo OK T02 chapitres validés seulement pour un élève

-- T03 Un visiteur non connecté voit le catalogue validé, aucune donnée personnelle.
select pg_temp.connecter('');
set role anon;
do $$ begin
  assert (select count(*) from chapitres) = 2, 'T03 : catalogue visiteur incorrect';
  begin
    perform 1 from eleves;
    raise exception 'T03 : un visiteur lit la table des élèves';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
\echo OK T03 visiteur

-- T04 Un élève ne peut ni écrire d'approbation, ni modifier un chapitre, ni valider.
select pg_temp.connecter('11111111-1111-1111-1111-111111111111');
set role authenticated;
do $$ begin
  begin
    insert into approbations (objet_type, objet_id, version, empreinte, decision, valideur_id)
    values ('chapitre', '00000000-0000-0000-0000-0000000000f2', 1, 'x', 'valide', '11111111-1111-1111-1111-111111111111');
    raise exception 'T04 : un élève a écrit une approbation';
  exception when insufficient_privilege then null;
  end;
  begin
    update chapitres set statut = 'valide' where id = '00000000-0000-0000-0000-0000000000f2';
    raise exception 'T04 : un élève a modifié un chapitre';
  exception when insufficient_privilege then null;
  end;
  begin
    perform valider_chapitre('00000000-0000-0000-0000-0000000000f2', 'valide', 1);
    raise exception 'T04 : un élève a validé un chapitre';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
\echo OK T04 un élève ne valide rien

-- T05 Le référent de la famille voit le chapitre à valider et le valide ; la trace est enregistrée.
select pg_temp.connecter('33333333-3333-3333-3333-333333333333');
set role authenticated;
do $$ begin
  assert (select count(*) from chapitres where statut = 'a_valider') = 1, 'T05 : le référent ne voit pas le chapitre à valider';
  perform valider_chapitre('00000000-0000-0000-0000-0000000000f2', 'valide', 1, 'Relu');
end $$;
reset role;
do $$ begin
  assert (select statut from chapitres where id = '00000000-0000-0000-0000-0000000000f2') = 'valide', 'T05 : statut non mis à jour';
  assert (select count(*) from approbations where objet_id = '00000000-0000-0000-0000-0000000000f2'
          and valideur_id = '33333333-3333-3333-3333-333333333333' and version = 1 and empreinte <> '') = 1,
         'T05 : approbation non tracée';
end $$;
\echo OK T05 validation par le référent de la famille

-- T06 Un référent d'une autre famille ne peut pas valider.
select pg_temp.connecter('44444444-4444-4444-4444-444444444444');
set role authenticated;
do $$ begin
  begin
    perform valider_chapitre('00000000-0000-0000-0000-0000000000f1', 'rejete', 1);
    raise exception 'T06 : un référent d''une autre famille a validé';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
\echo OK T06 pas de validation hors de sa famille

-- T07 Modifier un chapitre validé le repasse « à valider » avec une nouvelle version et une nouvelle empreinte.
do $$
declare v_avant text;
begin
  select empreinte into v_avant from chapitres where id = '00000000-0000-0000-0000-0000000000f2';
  update chapitres set titre = 'Chapitre modifié' where id = '00000000-0000-0000-0000-0000000000f2';
  assert (select statut from chapitres where id = '00000000-0000-0000-0000-0000000000f2') = 'a_valider', 'T07 : statut non réinitialisé';
  assert (select version from chapitres where id = '00000000-0000-0000-0000-0000000000f2') = 2, 'T07 : version non incrémentée';
  assert (select empreinte from chapitres where id = '00000000-0000-0000-0000-0000000000f2') <> v_avant, 'T07 : empreinte inchangée';
end $$;
\echo OK T07 modification = nouvelle validation

-- T08 Un référent ne peut pas valider une version qu'il n'a pas relue.
select pg_temp.connecter('33333333-3333-3333-3333-333333333333');
set role authenticated;
do $$ begin
  begin
    perform valider_chapitre('00000000-0000-0000-0000-0000000000f2', 'valide', 1);
    raise exception 'T08 : validation d''une version périmée acceptée';
  exception when serialization_failure then null;
  end;
end $$;
reset role;
\echo OK T08 validation liée à la version relue

-- T09 Agent Professeur : lit la progression de l'élève connecté seulement, chapitres validés de son unité seulement.
set role agent_professeur;
select set_config('app.eleve_id', '11111111-1111-1111-1111-111111111111', false),
       set_config('app.unite_id', '00000000-0000-0000-0000-0000000000e1', false);
do $$ begin
  assert (select count(*) from progression) = 1, 'T09 : l''agent voit la progression d''un autre élève';
  assert (select count(*) from chapitres) = 1, 'T09 : l''agent voit un chapitre hors de son unité ou non validé';
  assert not exists (select 1 from chapitres where unite_id <> '00000000-0000-0000-0000-0000000000e1'), 'T09 : chapitre d''une autre unité';
end $$;
\echo OK T09 agent Professeur limité à l’élève connecté et à son unité

-- T10 Agent Professeur : enregistre la progression sur son unité, refusé ailleurs ou pour un autre élève.
do $$ begin
  update progression set statut = 'termine', score = 80 where chapitre_id = '00000000-0000-0000-0000-0000000000f1';
  begin
    insert into progression (eleve_id, chapitre_id, statut)
    values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-0000000000f3', 'en_cours');
    raise exception 'T10 : progression écrite hors de l''unité de l''agent';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into progression (eleve_id, chapitre_id, statut)
    values ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-0000000000f1', 'en_cours');
    raise exception 'T10 : progression écrite pour un autre élève';
  exception when insufficient_privilege or unique_violation then null;
  end;
end $$;
\echo OK T10 progression écrite seulement dans le périmètre

-- T11 Agent Professeur : ne peut ni valider, ni approuver, ni modifier le programme, ni lire les élèves.
do $$ begin
  begin
    update chapitres set statut = 'valide';
    raise exception 'T11 : l''agent a modifié un chapitre';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into approbations (objet_type, objet_id, version, empreinte, decision, valideur_id)
    values ('chapitre', '00000000-0000-0000-0000-0000000000f2', 2, 'x', 'valide', '33333333-3333-3333-3333-333333333333');
    raise exception 'T11 : l''agent a écrit une approbation';
  exception when insufficient_privilege then null;
  end;
  begin
    perform valider_chapitre('00000000-0000-0000-0000-0000000000f2', 'valide', 2);
    raise exception 'T11 : l''agent a appelé la validation';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from eleves;
    raise exception 'T11 : l''agent lit la table des élèves';
  exception when insufficient_privilege then null;
  end;
end $$;
\echo OK T11 agent sans droit de validation ni de lecture des élèves

-- T12 Agent Professeur : signalement pour l'élève connecté ; la détresse est toujours en priorité 1.
do $$ begin
  insert into signalements (source, motif, priorite, eleve_id, chapitre_id, resume)
  values ('agent_professeur', 'detresse', 3, '11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-0000000000f1', 'Message fictif');
  begin
    insert into signalements (source, motif, priorite, eleve_id, resume)
    values ('agent_professeur', 'autre', 3, '22222222-2222-2222-2222-222222222222', 'Autre élève');
    raise exception 'T12 : signalement pour un autre élève accepté';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select set_config('app.eleve_id', '', false), set_config('app.unite_id', '', false);
do $$ begin
  assert (select priorite from signalements where motif = 'detresse') = 1, 'T12 : la détresse n''est pas prioritaire';
end $$;
\echo OK T12 signalements de l’agent

-- T13 Le référent de la famille lit le signalement ; l'élève B ne le lit pas.
select pg_temp.connecter('33333333-3333-3333-3333-333333333333');
set role authenticated;
do $$ begin
  assert (select count(*) from signalements) = 1, 'T13 : le référent ne voit pas le signalement';
end $$;
reset role;
select pg_temp.connecter('22222222-2222-2222-2222-222222222222');
set role authenticated;
do $$ begin
  assert (select count(*) from signalements) = 0, 'T13 : un élève voit un signalement';
end $$;
reset role;
\echo OK T13 lecture des signalements

-- T14 Inscription d'un élève mineur : compte en attente, jeton parent, activation par le parent seulement.
insert into auth.users (id) values ('66666666-6666-6666-6666-666666666666');
select pg_temp.connecter('66666666-6666-6666-6666-666666666666');
set role authenticated;
do $$ begin
  begin
    perform inscrire_eleve('Kofi', 'xx-general', 'n7', null, true, '+000 00 00 00');
    raise exception 'T14 : inscription acceptée sans série obligatoire';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform inscrire_eleve('Kofi', 'xx-general', 'n4', null, true, null);
    raise exception 'T14 : mineur inscrit sans contact parent';
  exception when invalid_parameter_value then null;
  end;
end $$;
select inscrire_eleve('Kofi', 'xx-general', 'n4', null, true, '+000 00 00 00') as demande \gset
do $$ begin
  assert (select statut from eleves) = 'en_attente_parent', 'T14 : un mineur est actif sans validation parentale';
  -- Revue de sécurité (S2) : l'élève ne reçoit que l'identifiant de la demande, jamais le jeton.
  begin
    perform emettre_jeton_consentement((select id from consentements limit 1));
    raise exception 'T14 : jeton émis pour la session de l''élève';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
set role service_messagerie;
select jeton from emettre_jeton_consentement(:'demande'::uuid) \gset
do $$ begin
  begin
    perform emettre_jeton_consentement((select id from consentements where empreinte_jeton is not null limit 1));
    raise exception 'T14 : jeton émis deux fois';
  exception when others then
    if sqlerrm like 'T14%' then raise; end if;
  end;
end $$;
reset role;
do $$ begin
  assert (select empreinte_jeton from consentements where eleve_id = '66666666-6666-6666-6666-666666666666') <> '',
    'T14 : jeton non enregistré';
end $$;
select count(*) = 0 as jeton_absent_en_clair from consentements where empreinte_jeton = :'jeton' \gset
\if :jeton_absent_en_clair
\else
  \echo ECHEC T14 jeton stocké en clair
  select 1/0;
\endif
select pg_temp.connecter('');
set role anon;
select confirmer_consentement_parent('mauvais-jeton') as faux \gset
select confirmer_consentement_parent(:'jeton') as vrai \gset
select confirmer_consentement_parent(:'jeton') as rejoue \gset
reset role;
do $$ begin
  assert (select statut from eleves where id = '66666666-6666-6666-6666-666666666666') = 'actif', 'T14 : compte non activé par le parent';
  assert (select empreinte_jeton is null from consentements where eleve_id = '66666666-6666-6666-6666-666666666666'), 'T14 : jeton réutilisable';
end $$;
\if :faux
  \echo ECHEC T14 un faux jeton a été accepté
  select 1/0;
\endif
\if :rejoue
  \echo ECHEC T14 un jeton a été accepté deux fois
  select 1/0;
\endif
\if :vrai
  \echo OK T14 inscription d’un mineur et validation parentale
\else
  \echo ECHEC T14 le bon jeton a été refusé
  select 1/0;
\endif


-- T15 Le rôle de connexion du serveur n'a aucun droit propre : il doit prendre le rôle de l'utilisateur.
set role serveur_application;
do $$ begin
  begin
    perform 1 from eleves;
    raise exception 'T15 : le rôle serveur lit les élèves sans prendre le rôle d''un utilisateur';
  exception when insufficient_privilege then null;
  end;
end $$;
set role authenticated;
reset role;
\echo OK T15 rôle serveur sans droit propre

\echo TOUS LES TESTS D’ACCÈS SONT PASSÉS
