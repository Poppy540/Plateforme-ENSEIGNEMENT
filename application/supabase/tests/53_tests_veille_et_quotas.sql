-- Tests de l'alerte de veille et du quota de l'assistant d'aide (Jalon 4, étape 0). Après 51 et 52.
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

select set_config('app.eleve_id', '', false), set_config('app.unite_id', '', false);
delete from alertes_veille;

-- W01 Toute priorité 1 est inscrite par la base, quel que soit l'agent ; pas les autres.
insert into signalements (id, source, motif, priorite, resume)
values ('e1111111-1111-4111-8111-111111111111', 'agent_tuteur', 'detresse', 2, 'Détresse (test).'),
       ('e2222222-2222-4222-8222-222222222222', 'agent_evaluateur', 'erreur_contenu', 2, 'Erreur (test).');
insert into tickets_support (id, categorie, priorite, resume)
values ('e3333333-3333-4333-8333-333333333333', 'paiement_suppression', 2, 'Remboursement (test).');
do $$ begin
  assert (select count(*) from alertes_veille) = 1, 'W01 : nombre d''alertes inscrites';
  assert (select motif from alertes_veille) = 'detresse', 'W01 : motif de l''alerte';
end $$;
\echo OK W01 détresse inscrite comme alerte de veille, rien d autre

-- W02 Personne d'autre que le service de messagerie ne lit ni n'envoie les alertes.
set role agent_support;
do $$ begin
  begin
    perform 1 from alertes_veille;
    raise exception 'W02 : alertes lisibles par un agent';
  exception when insufficient_privilege then null;
  end;
  begin
    perform alertes_veille_a_envoyer(0, 3);
    raise exception 'W02 : envoi déclenché par un agent';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
\echo OK W02 alertes réservées au service de messagerie

-- W03 Premier envoi, pas de relance avant le délai, relance après, arrêt une fois traité.
set role service_messagerie;
do $$ begin
  assert (select count(*) from alertes_veille_a_envoyer(120, 3)) = 1, 'W03 : premier envoi';
  assert (select count(*) from alertes_veille_a_envoyer(120, 3)) = 0, 'W03 : relance avant le délai';
end $$;
reset role;
update alertes_veille set dernier_envoi_le = now() - interval '3 hours';
set role service_messagerie;
do $$ begin
  assert (select envois from alertes_veille_a_envoyer(120, 3)) = 2, 'W03 : relance après le délai';
end $$;
reset role;
update alertes_veille set dernier_envoi_le = now() - interval '3 hours';
update signalements set traite_le = now() where id = 'e1111111-1111-4111-8111-111111111111';
set role service_messagerie;
do $$ begin
  assert (select count(*) from alertes_veille_a_envoyer(120, 3)) = 0, 'W03 : relance après traitement';
end $$;
reset role;
\echo OK W03 envoi, relance après le délai, arrêt une fois traité

-- W04 Quota de l'assistant : par personne fixée par le serveur, plafonné, inaccessible aux autres rôles.
select set_config('app.eleve_id', 'e4444444-4444-4444-8444-444444444444', false);
set role agent_support;
do $$ begin
  assert prendre_quota_support(2), 'W04 : première question';
  assert prendre_quota_support(2), 'W04 : deuxième question';
  assert not prendre_quota_support(2), 'W04 : quota dépassé accepté';
  begin
    perform 1 from quotas_support;
    raise exception 'W04 : quotas lisibles';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select set_config('app.eleve_id', '', false);
set role agent_support;
do $$ begin
  begin
    perform prendre_quota_support(2);
    raise exception 'W04 : quota sans personne fixée';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
set role authenticated;
do $$ begin
  begin
    perform prendre_quota_support(2);
    raise exception 'W04 : quota consommé par un utilisateur';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
\echo OK W04 quota de l assistant en base, par personne, plafonné

\echo TOUS LES TESTS DE LA VEILLE ET DES QUOTAS SONT PASSÉS
