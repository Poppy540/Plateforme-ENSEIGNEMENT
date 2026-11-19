-- Fin du pilote : période et chiffres d'une période (Jalon 14, étape 1 ; ADR 0084). Après 72 : administrateur
-- 5555…, référent 3333…. Signalements FICTIFS, supprimés à la fin.
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

create function pg_temp.connecter(p_utilisateur text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_utilisateur, false)
$$;

insert into signalements (source, motif, priorite, resume, cree_le) values
  ('agent_professeur', 'erreur_contenu', 2, 'Fin fictive : erreur', now() - interval '3 days'),
  ('agent_orchestrateur', 'autre', 2, 'Critère de suspension du pilote : essai fictif', now() - interval '2 days'),
  ('agent_orchestrateur', 'autre', 2, 'Autre alerte fictive', now() - interval '2 days');

-- FP01 Réservé à l'administration.
select pg_temp.connecter('33333333-3333-3333-3333-333333333333');
set role authenticated;
do $$ begin
  begin perform definir_periode_pilote(current_date, null, 'x'); raise exception 'FP01 : référent définit la période';
  exception when insufficient_privilege then null; end;
  begin perform chiffres_periode(current_date - 7, current_date); raise exception 'FP01 : référent lit les chiffres';
  exception when insufficient_privilege then null; end;
  begin perform chiffres_periode_interne(current_date - 7, current_date); raise exception 'FP01 : fonction interne';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- FP02 Période : contrôlée, corrigeable, tracée ; table illisible directement.
select pg_temp.connecter('55555555-5555-4555-8555-555555555555');
set role authenticated;
do $$ begin
  assert (select count(*) from periode_pilote_lire()) = 0, 'FP02 : pas encore de période';
  begin perform definir_periode_pilote(current_date, current_date - 1, 'x'); raise exception 'FP02 : fin avant début';
  exception when invalid_parameter_value then null; end;
  begin perform definir_periode_pilote(current_date - 400, current_date, 'x'); raise exception 'FP02 : plus d''un an';
  exception when invalid_parameter_value then null; end;
  perform definir_periode_pilote(current_date - 27, null, 'empreinte-admin');
  assert (select fin from periode_pilote_lire()) is null, 'FP02 : pilote en cours';
  perform definir_periode_pilote(current_date - 27, current_date, 'empreinte-admin');
  assert (select fin from periode_pilote_lire()) = current_date, 'FP02 : fin notée';
  begin perform 1 from periode_pilote; raise exception 'FP02 : table lisible';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  assert (select count(*) from journal_audit where action = 'periode_pilote') = 2, 'FP02 : audit';
end $$;

-- FP03 Chiffres d'une période ; le rapport hebdomadaire donne les mêmes chiffres pour la même semaine.
select pg_temp.connecter('55555555-5555-4555-8555-555555555555');
set role authenticated;
do $$ declare p record; s record; begin
  begin perform chiffres_periode(current_date, current_date - 1); raise exception 'FP03 : période inversée';
  exception when invalid_parameter_value then null; end;
  select * into p from chiffres_periode(current_date - 6, current_date);
  select * into s from semaine_pilote(current_date) where periode = 'semaine';
  assert p.signalements = s.signalements and p.erreurs_contenu = s.erreurs_contenu and p.cout_usd = s.cout_usd,
    'FP03 : mêmes chiffres que la semaine';
  assert p.erreurs_contenu >= 1, 'FP03 : erreur de contenu comptée';
  assert (select count(*) from alertes_criteres_periode(current_date - 6, current_date)) = 1,
    'FP03 : seules les alertes de critères';
  assert (select count(*) from alertes_criteres_periode(current_date - 60, current_date - 30)) = 0,
    'FP03 : hors période';
end $$;
reset role;

delete from signalements where resume in ('Fin fictive : erreur', 'Critère de suspension du pilote : essai fictif',
                                          'Autre alerte fictive');
delete from periode_pilote;

\o
\echo 'OK FP01 fin du pilote réservée à l''administration'
\echo 'OK FP02 période du pilote contrôlée, corrigeable et tracée'
\echo 'OK FP03 chiffres d''une période, identiques au rapport de la semaine ; alertes de critères de la période'
