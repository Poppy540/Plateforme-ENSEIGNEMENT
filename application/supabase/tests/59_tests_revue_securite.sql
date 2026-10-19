-- Revue de sécurité et de confidentialité (Jalon 5, étape 0 ; ADR 0043). Après 58 (pack de test « zz »).
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

create function pg_temp.connecter(p_utilisateur text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_utilisateur, false)
$$;
insert into auth.users (id) values
  ('59595959-5959-4959-8959-595959595901'), ('59595959-5959-4959-8959-595959595902');

-- S01 Accord parental : un élève du pilote (âge de la majorité inconnu) ne peut pas se déclarer majeur.
select pg_temp.connecter('59595959-5959-4959-8959-595959595901');
set role authenticated;
do $$ begin
  begin
    perform inscrire_eleve('Mineur', 'ga-general', '3e', null, false, null);
    raise exception 'S01 : majorité déclarée acceptée sans âge connu';
  exception when invalid_parameter_value then null;
  end;
  assert not exists (select 1 from profils where id = auth.uid()), 'S01 : compte créé';
end $$;
reset role;
-- Dans un pays dont le pack fixe la majorité, la déclaration reste possible (pays fictif Z : 16 ans).
select pg_temp.connecter('59595959-5959-4959-8959-595959595902');
set role authenticated;
do $$ begin
  assert inscrire_eleve('Majeur', 'zz-general', 'an3', null, false, null) is null, 'S01 : aucune demande pour un majeur';
  assert (select statut from eleves) = 'actif', 'S01 : majeur du pays Z';
end $$;
reset role;
\echo OK S01 majorité refusée quand le pays ne la connaît pas

-- S02 Droits retirés aux sessions : liste d'opposition, insertion de signalements, état d'accord d'autrui.
select pg_temp.connecter('59595959-5959-4959-8959-595959595902');
set role authenticated;
do $$ begin
  begin perform dans_opposition('x@exemple.invalid'); raise exception 'S02 : liste d''opposition interrogée';
  exception when insufficient_privilege then null; end;
  begin
    insert into signalements (source, motif, priorite, eleve_id, resume)
    values ('eleve', 'detresse', 1, auth.uid(), 'Fausse alerte');
    raise exception 'S02 : signalement inséré directement';
  exception when insufficient_privilege then null; end;
  begin perform consentement_actif('11111111-1111-1111-1111-111111111111', 'rapport_parents');
    raise exception 'S02 : état d''accord d''un autre élève';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
\echo OK S02 opposition, signalements et accords inaccessibles depuis une session

-- S03 Quotas : pris avant l'appel, limités par jour, réservés à l'élève connecté.
select pg_temp.connecter('59595959-5959-4959-8959-595959595902');
set role authenticated;
do $$ begin
  assert prendre_quota_eleve('plan_tuteur', 2), 'S03 : première place';
  assert prendre_quota_eleve('plan_tuteur', 2), 'S03 : deuxième place';
  assert not prendre_quota_eleve('plan_tuteur', 2), 'S03 : quota dépassé';
  assert prendre_quota_eleve('correction_quiz', 2), 'S03 : quotas séparés par nature';
  begin perform prendre_quota_eleve('question_parent', 99); raise exception 'S03 : nature réservée aux parents';
  exception when insufficient_privilege then null; end;
  begin perform 1 from quotas_eleves; raise exception 'S03 : quotas lisibles';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set role anon;
do $$ begin
  assert not prendre_quota_parent('jeton-inconnu', 5), 'S03 : quota parent sans lien valide';
end $$;
reset role;
\echo OK S03 quotas pris avant l appel au modèle

-- S04 Un rapport de cohérence traité ne reçoit plus de décision.
do $$
declare v_rapport uuid;
begin
  insert into rapports_coordinateur (referentiel_id, famille, version, contenu, statut)
  select id, 'mathematiques', 99, '{}', 'traite' from referentiels where code = 'ga-general'
  returning id into v_rapport;
  update rapports_coordinateur set statut = 'traite' where id = v_rapport;
  begin
    insert into decisions_coordinateur (rapport_id, nature, indice, decision, decide_par)
    values (v_rapport, 'lien', 0, 'acceptee', '77777777-7777-4777-8777-777777777777');
    raise exception 'S04 : décision sur un rapport traité';
  exception when invalid_parameter_value then null;
  end;
  delete from rapports_coordinateur where id = v_rapport;
end $$;
\echo OK S04 aucune décision sur un rapport traité

-- S05 L'agent Conformité ne lit que les prérequis de son référentiel.
select set_config('app.referentiel_id', (select id::text from referentiels where code = 'zz-general'), false),
       set_config('app.unite_id', '', false), set_config('app.document_id', '', false),
       set_config('app.eleve_id', '', false);
set role agent_conformite;
do $$ begin
  assert (select count(*) from prerequis_chapitres) = 3, 'S05 : prérequis du pays Z';
end $$;
reset role;
\echo OK S05 prérequis cloisonnés pour la Conformité

-- S06 Connexion : envois et essais de code limités par fenêtre, table illisible.
set role anon;
do $$ begin
  assert limiter_connexion(repeat('a', 64), 'envoi', 2, 15), 'S06 : premier envoi';
  assert limiter_connexion(repeat('a', 64), 'envoi', 2, 15), 'S06 : deuxième envoi';
  assert not limiter_connexion(repeat('a', 64), 'envoi', 2, 15), 'S06 : troisième envoi accepté';
  assert limiter_connexion(repeat('a', 64), 'verification', 1, 15), 'S06 : natures séparées';
  assert not limiter_connexion(repeat('a', 64), 'verification', 1, 15), 'S06 : essai faux de trop';
  perform rendre_essai_connexion(repeat('a', 64));
  assert limiter_connexion(repeat('a', 64), 'verification', 1, 15), 'S06 : essai juste rendu';
  begin perform 1 from limites_connexion; raise exception 'S06 : limites lisibles';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
update limites_connexion set debut = now() - interval '20 minutes' where cle = repeat('a', 64);
set role anon;
do $$ begin
  assert limiter_connexion(repeat('a', 64), 'envoi', 2, 15), 'S06 : nouvelle fenêtre';
end $$;
reset role;
\echo OK S06 envois et essais de code limités

\echo TOUS LES TESTS DE LA REVUE DE SÉCURITÉ SONT PASSÉS
