-- Journal du pilote et reprise (Jalon 13, étape 2 ; ADR 0081). Après 70 : administrateur 5555…, référent 3333….
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

create function pg_temp.connecter(p_utilisateur text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_utilisateur, false)
$$;

-- JP01 Réservé à l'administration ; journal illisible directement.
select pg_temp.connecter('33333333-3333-3333-3333-333333333333');
set role authenticated;
do $$ begin
  begin perform suspendre_agent_pilote('tuteur', 'Essai fictif', null, 'x'); raise exception 'JP01 : référent suspend';
  exception when insufficient_privilege then null; end;
  begin perform journal_pilote_liste(10); raise exception 'JP01 : référent lit le journal';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- JP02 Suspension puis reprise d'un agent : motif exigé, reprise refusée sans les 4 points.
select pg_temp.connecter('55555555-5555-4555-8555-555555555555');
set role authenticated;
do $$ begin
  begin perform 1 from journal_pilote; raise exception 'JP02 : journal lisible';
  exception when insufficient_privilege then null; end;
  begin perform suspendre_agent_pilote('tuteur', 'x', null, 'x'); raise exception 'JP02 : motif trop court';
  exception when invalid_parameter_value then null; end;
  begin perform suspendre_agent_pilote('inconnu', 'Essai fictif', null, 'x'); raise exception 'JP02 : agent inconnu';
  exception when invalid_parameter_value then null; end;
  perform suspendre_agent_pilote('tuteur', 'Sortie de périmètre fictive', 'sortie_perimetre', 'empreinte-admin');
  assert (select suspendu from etat_agents where agent = 'tuteur'), 'JP02 : agent suspendu';
  begin perform suspendre_agent_pilote('tuteur', 'Encore', null, 'x'); raise exception 'JP02 : déjà suspendu';
  exception when invalid_parameter_value then null; end;
  begin perform reprendre_agent_pilote('tuteur', 'Cause fictive', 'Test ajouté', false, true, 'x');
    raise exception 'JP02 : reprise sans accord';
  exception when invalid_parameter_value then null; end;
  begin perform reprendre_agent_pilote('tuteur', 'Cause fictive', 'Test ajouté', true, false, 'x');
    raise exception 'JP02 : reprise sans établissement informé';
  exception when invalid_parameter_value then null; end;
  begin perform reprendre_agent_pilote('tuteur', '', 'Test ajouté', true, true, 'x');
    raise exception 'JP02 : reprise sans cause';
  exception when invalid_parameter_value then null; end;
  assert (select suspendu from etat_agents where agent = 'tuteur'), 'JP02 : toujours suspendu';
  perform reprendre_agent_pilote('tuteur', 'Consigne mal comprise (fictif)', 'Test TU ajouté et passé',
                                 true, true, 'empreinte-admin');
  assert not (select suspendu from etat_agents where agent = 'tuteur'), 'JP02 : agent réactivé';
end $$;
reset role;

-- JP03 Accès des élèves : fermeture motivée, réouverture avec les 4 points ; deux suspensions pour la même cause.
select pg_temp.connecter('55555555-5555-4555-8555-555555555555');
set role authenticated;
do $$ declare f record; begin
  perform fermer_acces_pilote('Fuite de données fictive', 'fuite_donnees', 'empreinte-admin');
  assert not (select ouvert from acces_eleves), 'JP03 : accès fermé';
  begin perform fermer_acces_pilote('Encore', null, 'x'); raise exception 'JP03 : déjà fermé';
  exception when invalid_parameter_value then null; end;
  begin perform rouvrir_acces_pilote('Cause fictive', 'Correction fictive', true, false, 'x');
    raise exception 'JP03 : réouverture sans établissement informé';
  exception when invalid_parameter_value then null; end;
  perform rouvrir_acces_pilote('Règle d''accès corrigée (fictif)', 'Test de base ajouté', true, true, 'empreinte-admin');
  assert (select ouvert from acces_eleves), 'JP03 : accès rouvert';
  select * into f from faits_criteres_pilote(null, null, null);
  assert f.suspensions_meme_cause_max = 1, 'JP03 : une suspension par cause';
  perform fermer_acces_pilote('Deuxième fuite fictive', 'fuite_donnees', 'empreinte-admin');
  select * into f from faits_criteres_pilote(null, null, null);
  assert f.suspensions_meme_cause_max = 2, 'JP03 : deux suspensions pour la même cause';
  perform rouvrir_acces_pilote('Cause fictive', 'Correction fictive', true, true, 'empreinte-admin');
end $$;
reset role;

-- JP04 Points hebdomadaires et notes ; liste du journal ; audit ; critère calculé plus déclarable.
select pg_temp.connecter('55555555-5555-4555-8555-555555555555');
set role authenticated;
do $$ begin
  perform noter_journal_pilote('point_hebdomadaire', 'Point fictif : rien à signaler', null, 'empreinte-admin');
  perform noter_journal_pilote('note', 'Note fictive', 'equipe_indisponible', 'empreinte-admin');
  begin perform noter_journal_pilote('suspension_agent', 'Détournement', null, 'x'); raise exception 'JP04 : type interdit';
  exception when invalid_parameter_value then null; end;
  assert (select count(*) from journal_pilote_liste(100)) = 8, 'JP04 : huit entrées';
  assert (select type from journal_pilote_liste(1)) = 'note', 'JP04 : la plus récente d''abord';
  assert (select count(*) from journal_pilote_liste(100) where cause is not null) = 3, 'JP04 : trois reprises';
  begin perform declarer_critere('suspensions_repetees', 'Essai fictif', 'x'); raise exception 'JP04 : critère calculé déclaré';
  exception when invalid_parameter_value then null; end;
end $$;
reset role;
do $$ begin
  assert (select count(*) from journal_audit where action like 'journal_pilote_%') = 8, 'JP04 : audit';
end $$;

delete from journal_pilote;

\o
\echo 'OK JP01 journal du pilote réservé à l''administration'
\echo 'OK JP02 suspension motivée, reprise d''un agent avec les 4 points seulement'
\echo 'OK JP03 accès des élèves fermé puis rouvert avec les 4 points ; deux suspensions pour une même cause'
\echo 'OK JP04 points hebdomadaires et notes, liste, audit'
