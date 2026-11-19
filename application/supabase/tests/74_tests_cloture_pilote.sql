-- Clôture du pilote (Jalon 14, étape 2 ; ADR 0085). Après 73 : administrateur 5555…, référent 3333….
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

create function pg_temp.connecter(p_utilisateur text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_utilisateur, false)
$$;

-- CL01 Réservé à l'administration.
select pg_temp.connecter('33333333-3333-3333-3333-333333333333');
set role authenticated;
do $$ begin
  begin perform faits_cloture(); raise exception 'CL01 : référent lit la clôture';
  exception when insufficient_privilege then null; end;
  begin perform noter_decision_finale('arreter', 'Essai fictif', 'x'); raise exception 'CL01 : référent décide';
  exception when insufficient_privilege then null; end;
  begin perform cocher_geste_cloture('reunion_bilan', 'Essai fictif', current_date, 'x');
    raise exception 'CL01 : référent coche';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- CL02 Faits : sans période, rien ; période finie, rapport téléchargé après la fin, décision finale.
select pg_temp.connecter('55555555-5555-4555-8555-555555555555');
set role authenticated;
do $$ declare f record; begin
  select * into f from faits_cloture();
  assert f.periode_debut is null and f.decision is null and f.rapports_telecharges = 0, 'CL02 : rien au départ';
  perform definir_periode_pilote(current_date - 28, current_date - 1, 'empreinte-admin');
  perform noter_rapport_fin_telecharge('equipe', 'empreinte-admin');
  begin perform noter_decision_finale('abandonner', 'Essai fictif', 'x'); raise exception 'CL02 : décision inconnue';
  exception when invalid_parameter_value then null; end;
  begin perform noter_decision_finale('arreter', 'x', 'x'); raise exception 'CL02 : motif trop court';
  exception when invalid_parameter_value then null; end;
  perform noter_decision_finale('prolonger', 'Deux semaines de plus (fictif)', 'empreinte-admin');
  perform noter_decision_finale('arreter', 'Fin prévue atteinte (fictif)', 'empreinte-admin');
  select * into f from faits_cloture();
  assert f.periode_fin = current_date - 1, 'CL02 : fin de période';
  assert f.rapports_telecharges = 1, 'CL02 : rapport téléchargé';
  assert f.decision = 'Arrêter le pilote : Fin prévue atteinte (fictif)', 'CL02 : dernière décision';
  assert (select count(*) from journal_pilote_liste(10) where type = 'decision_finale') = 2, 'CL02 : décisions au journal';
end $$;
reset role;

-- CL03 Gestes cochés : contrôlés, tracés ; un geste vérifié par la plateforme ne se coche pas.
select pg_temp.connecter('55555555-5555-4555-8555-555555555555');
set role authenticated;
do $$ begin
  begin perform cocher_geste_cloture('decision_finale', 'Essai fictif', current_date, 'x');
    raise exception 'CL03 : geste vérifié coché';
  exception when invalid_parameter_value then null; end;
  begin perform cocher_geste_cloture('reunion_bilan', 'Essai fictif', current_date + 30, 'x');
    raise exception 'CL03 : date future';
  exception when invalid_parameter_value then null; end;
  perform cocher_geste_cloture('reunion_bilan', 'Réunion de bilan fictive tenue', current_date, 'empreinte-admin');
  assert (select count(*) from gestes_cloture_coches()) = 1, 'CL03 : un geste coché';
  begin perform 1 from gestes_cloture; raise exception 'CL03 : table lisible';
  exception when insufficient_privilege then null; end;
  assert decocher_geste_cloture('reunion_bilan', 'Réunion reportée', 'empreinte-admin'), 'CL03 : décoché';
end $$;
reset role;
do $$ begin
  assert (select count(*) from journal_audit where action in ('geste_cloture_coche', 'geste_cloture_decoche')) = 2,
    'CL03 : audit';
  assert (select count(*) from journal_audit where action = 'journal_pilote_decision_finale') = 2, 'CL03 : audit des décisions';
end $$;

delete from journal_pilote;
delete from gestes_cloture;
delete from periode_pilote;

\o
\echo 'OK CL01 clôture du pilote réservée à l''administration'
\echo 'OK CL02 période finie, rapport de fin téléchargé, décision finale au journal'
\echo 'OK CL03 gestes cochés avec preuve, contrôlés et tracés'
