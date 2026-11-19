-- Critères de suspension du pilote (Jalon 13, étape 1 ; ADR 0080). Après 69 : administrateur 5555…, référent
-- 3333…, élève 1111… ; signalements et contestations FICTIFS, supprimés à la fin.
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

create function pg_temp.connecter(p_utilisateur text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_utilisateur, false)
$$;

-- Faits FICTIFS : une détresse ouverte depuis 3 h, une autre depuis 13 h, une traitée ; une erreur de contenu
-- ouverte depuis 8 jours ; un coût de 30 USD hier.
insert into signalements (source, motif, priorite, resume, cree_le) values
  ('agent_professeur', 'detresse', 1, 'Détresse fictive récente', now() - interval '3 hours'),
  ('agent_professeur', 'detresse', 1, 'Détresse fictive ancienne', now() - interval '13 hours'),
  ('agent_professeur', 'erreur_contenu', 2, 'Erreur fictive ancienne', now() - interval '8 days');
insert into signalements (source, motif, priorite, resume, cree_le, traite_le) values
  ('agent_professeur', 'detresse', 1, 'Détresse fictive traitée', now() - interval '20 hours', now());
insert into consommation_agents (agent, jour, cout_usd) values ('professeur', current_date - 1, 30)
  on conflict (agent, jour) do update set cout_usd = consommation_agents.cout_usd + 30;

-- CR01 Faits : administration seulement, en nombres ; délais non fixés = null.
select pg_temp.connecter('33333333-3333-3333-3333-333333333333');
set role authenticated;
do $$ begin
  begin perform faits_criteres_pilote(2, 12, 7); raise exception 'CR01 : référent lit les faits';
  exception when insufficient_privilege then null; end;
  begin perform declarer_critere('fuite_donnees', 'Essai', 'x'); raise exception 'CR01 : référent déclare';
  exception when insufficient_privilege then null; end;
  begin perform faits_criteres_orchestrateur(2, 12, 7); raise exception 'CR01 : référent, entrée Orchestrateur';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select pg_temp.connecter('55555555-5555-4555-8555-555555555555');
set role authenticated;
do $$ declare f record; begin
  select * into f from faits_criteres_pilote(2, 12, 7);
  assert f.detresses_hors_delai = 2, 'CR01 : deux détresses au-delà de 2 h';
  assert f.detresses_hors_delai_max = 1, 'CR01 : une détresse au-delà de 12 h';
  assert f.erreurs_contenu_anciennes = 1, 'CR01 : une erreur de contenu ancienne';
  assert f.cout_7_jours >= 30, 'CR01 : coût des 7 jours';
  assert f.acces_eleves_ouvert, 'CR01 : accès ouvert';
  select * into f from faits_criteres_pilote(null, null, null);
  assert f.detresses_hors_delai is null and f.erreurs_contenu_anciennes is null, 'CR01 : non surveillé';
end $$;
reset role;

-- CR02 Déclaration et levée : contrôlées, tracées ; un critère calculé ne se déclare pas.
select pg_temp.connecter('55555555-5555-4555-8555-555555555555');
set role authenticated;
do $$ begin
  begin perform declarer_critere('detresse_hors_delai', 'Essai fictif', 'x'); raise exception 'CR02 : critère calculé';
  exception when invalid_parameter_value then null; end;
  begin perform declarer_critere('fuite_donnees', 'ok', 'x'); raise exception 'CR02 : motif trop court';
  exception when invalid_parameter_value then null; end;
  perform declarer_critere('fuite_donnees', 'Essai fictif de déclaration', 'empreinte-admin');
  perform declarer_critere('fuite_donnees', 'Essai fictif, motif précisé', 'empreinte-admin');
  assert (select count(*) from criteres_declares_liste()) = 1, 'CR02 : un critère déclaré';
  assert (select motif from criteres_declares_liste()) = 'Essai fictif, motif précisé', 'CR02 : motif mis à jour';
  begin perform 1 from criteres_declares; raise exception 'CR02 : table lisible';
  exception when insufficient_privilege then null; end;
  assert lever_critere('fuite_donnees', 'Essai terminé', 'empreinte-admin'), 'CR02 : levée';
  assert not lever_critere('fuite_donnees', 'Essai terminé', 'empreinte-admin'), 'CR02 : déjà levé';
end $$;
reset role;
do $$ begin
  assert (select count(*) from journal_audit where action = 'critere_pilote_declare') = 2, 'CR02 : audit des déclarations';
  assert (select count(*) from journal_audit where action = 'critere_pilote_leve') = 1, 'CR02 : audit de la levée';
end $$;

-- CR03 Alertes de l'Orchestrateur : une par épisode, sans élève ; un critère redevenu calme peut être resignalé.
set role agent_orchestrateur;
do $$ declare n integer; begin
  assert (select count(*) from faits_criteres_orchestrateur(2, 12, 7)) = 1, 'CR03 : faits lisibles';
  select sum(nombre) into n from alerter_criteres_pilote(
    '[{"critere": "detresse_hors_delai", "priorite": 1, "resume": "1 détresse non prise en charge (fictif)"},
      {"critere": "erreur_contenu_non_corrigee", "priorite": 2, "resume": "1 erreur de contenu (fictif)"}]');
  assert n = 2, 'CR03 : deux alertes';
  select sum(nombre) into n from alerter_criteres_pilote(
    '[{"critere": "detresse_hors_delai", "priorite": 1, "resume": "1 détresse non prise en charge (fictif)"},
      {"critere": "erreur_contenu_non_corrigee", "priorite": 2, "resume": "1 erreur de contenu (fictif)"}]');
  assert n = 0, 'CR03 : pas de doublon';
  select sum(nombre) into n from alerter_criteres_pilote(
    '[{"critere": "detresse_hors_delai", "priorite": 1, "resume": "1 détresse non prise en charge (fictif)"}]');
  assert n = 0, 'CR03 : l''erreur redevient calme';
  select sum(nombre) into n from alerter_criteres_pilote(
    '[{"critere": "erreur_contenu_non_corrigee", "priorite": 2, "resume": "Nouvel épisode (fictif)"}]');
  assert n = 1, 'CR03 : nouvel épisode signalé';
  begin perform alerter_criteres_pilote('[{"critere": "x", "priorite": 3, "resume": ""}]');
    raise exception 'CR03 : priorité invalide';
  exception when invalid_parameter_value then null; end;
  begin perform 1 from alertes_criteres; raise exception 'CR03 : table lisible';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  assert (select count(*) from signalements where resume like 'Critère de suspension du pilote : %') = 3,
    'CR03 : trois alertes dans la file humaine';
  assert not exists (select 1 from signalements where resume like 'Critère de suspension du pilote : %'
                     and eleve_id is not null), 'CR03 : aucune alerte liée à un élève';
end $$;
set role anon;
do $$ begin
  begin perform alerter_criteres_pilote('[]'); raise exception 'CR03 : visiteur';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

delete from signalements where resume like 'Critère de suspension du pilote : %' or resume like '%fictive%';
delete from alertes_criteres;
update consommation_agents set cout_usd = cout_usd - 30 where agent = 'professeur' and jour = current_date - 1;

\o
\echo 'OK CR01 faits du suivi du pilote en nombres, pour l''administration seulement'
\echo 'OK CR02 critères déclarés puis levés avec un motif, contrôlés et tracés'
\echo 'OK CR03 alertes de l''Orchestrateur : une par épisode, sans élève'
