-- Tests de l'Orchestrateur côté base (Jalon 3, étape 2). Après 47.
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

create function pg_temp.connecter(p_utilisateur text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_utilisateur, false)
$$;
select set_config('app.eleve_id', '', false), set_config('app.unite_id', '', false);

-- O01 Alertes de l'Orchestrateur dans la file humaine, sans élève.
set role agent_orchestrateur;
do $$ begin
  insert into signalements (source, motif, priorite, resume)
  values ('agent_orchestrateur', 'autre', 2, 'Coût anormal (test).');
  begin
    insert into signalements (source, motif, priorite, eleve_id, resume)
    values ('agent_orchestrateur', 'autre', 2, '11111111-1111-1111-1111-111111111111', 'Avec élève');
    raise exception 'O01 : alerte liée à un élève';
  exception when insufficient_privilege then null;
  end;
  update etat_agents set suspendu = true, motif = 'Test' where agent = 'evaluateur';
end $$;
reset role;
\echo OK O01 alertes de l Orchestrateur dans la file humaine

-- O02 Réactivation d'un agent : administration seulement.
insert into auth.users (id) values ('55555555-5555-4555-8555-555555555555');
insert into profils (id, role, prenom_ou_pseudo) values ('55555555-5555-4555-8555-555555555555', 'administrateur', 'Admin fictif');
select pg_temp.connecter('77777777-7777-4777-8777-777777777777');
set role authenticated;
do $$ begin
  update etat_agents set suspendu = false where agent = 'evaluateur';
  assert (select count(*) from etat_agents) = 0, 'O02 : état des agents visible par un référent';
end $$;
reset role;
do $$ begin
  assert (select suspendu from etat_agents where agent = 'evaluateur'), 'O02 : agent réactivé par un référent';
end $$;
select pg_temp.connecter('55555555-5555-4555-8555-555555555555');
set role authenticated;
do $$ begin
  update etat_agents set suspendu = false, motif = null where agent = 'evaluateur';
  insert into journal_audit (acteur, action, objet_type) values ('administrateur', 'reactivation', 'agent');
end $$;
reset role;
do $$ begin
  assert not (select suspendu from etat_agents where agent = 'evaluateur'), 'O02 : réactivation par l''administration';
end $$;
\echo OK O02 réactivation d un agent réservée à l administration

\echo TOUS LES TESTS DE L ORCHESTRATEUR SONT PASSÉS
