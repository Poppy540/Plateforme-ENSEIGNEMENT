-- Tests du traitement de la file humaine par l'administration (Jalon 3, étape 6). Après 48 (administrateur fictif).
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

create function pg_temp.connecter(p_utilisateur text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_utilisateur, false)
$$;
select set_config('app.eleve_id', '', false), set_config('app.unite_id', '', false);

insert into signalements (id, source, motif, priorite, resume)
values ('f1111111-1111-4111-8111-111111111111', 'agent_support', 'detresse', 1, 'Détresse (test).');
insert into tickets_support (id, categorie, priorite, resume)
values ('f2222222-2222-4222-8222-222222222222', 'autre', 3, 'Question hors FAQ (test).');

-- F01 Un référent ne traite rien.
select pg_temp.connecter('77777777-7777-4777-8777-777777777777');
set role authenticated;
do $$ begin
  update signalements set traite_le = now(), traite_par = auth.uid() where id = 'f1111111-1111-4111-8111-111111111111';
  update tickets_support set statut = 'resolu', traite_le = now(), traite_par = auth.uid()
  where id = 'f2222222-2222-4222-8222-222222222222';
end $$;
reset role;
do $$ begin
  assert (select traite_le is null from signalements where id = 'f1111111-1111-4111-8111-111111111111'),
    'F01 : signalement traité par un référent';
  assert (select statut = 'ouvert' from tickets_support where id = 'f2222222-2222-4222-8222-222222222222'),
    'F01 : ticket traité par un référent';
end $$;
\echo OK F01 un référent ne traite pas la file humaine

-- F02 L'administration traite en son nom seulement, sans rouvrir.
select pg_temp.connecter('55555555-5555-4555-8555-555555555555');
set role authenticated;
do $$ begin
  begin
    update signalements set traite_le = now(), traite_par = '77777777-7777-4777-8777-777777777777'
    where id = 'f1111111-1111-4111-8111-111111111111';
    raise exception 'F02 : traitement attribué à un autre';
  exception when insufficient_privilege then null;
  end;
  update signalements set traite_le = now(), traite_par = auth.uid() where id = 'f1111111-1111-4111-8111-111111111111';
  update tickets_support set statut = 'en_cours', traite_par = auth.uid() where id = 'f2222222-2222-4222-8222-222222222222';
  update tickets_support set statut = 'resolu', traite_le = now(), traite_par = auth.uid()
  where id = 'f2222222-2222-4222-8222-222222222222';
  update signalements set traite_le = null where id = 'f1111111-1111-4111-8111-111111111111';
  update tickets_support set statut = 'ouvert' where id = 'f2222222-2222-4222-8222-222222222222';
  begin
    update signalements set resume = 'modifié' where id = 'f1111111-1111-4111-8111-111111111111';
    raise exception 'F02 : résumé modifiable';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
do $$ begin
  assert (select traite_par = '55555555-5555-4555-8555-555555555555' and traite_le is not null
          from signalements where id = 'f1111111-1111-4111-8111-111111111111'), 'F02 : signalement non traité ou rouvert';
  assert (select statut = 'resolu' from tickets_support where id = 'f2222222-2222-4222-8222-222222222222'),
    'F02 : ticket non résolu ou rouvert';
end $$;
\echo OK F02 traitement par l administration en son nom, sans réouverture

\echo TOUS LES TESTS DE LA FILE HUMAINE SONT PASSÉS
