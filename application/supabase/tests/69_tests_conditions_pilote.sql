-- Tableau des 12 conditions du pilote (Jalon 12, étape 4 ; ADR 0078). Après 68 : administrateur 5555…,
-- référents maths 3333… et histoire 4444…, unités fictives « xx-n4-maths » et « xx-n4-histoire ».
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

create function pg_temp.connecter(p_utilisateur text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_utilisateur, false)
$$;

-- CO01 Faits vérifiés en base : administration seulement, en nombres.
select pg_temp.connecter('33333333-3333-3333-3333-333333333333');
set role authenticated;
do $$ begin
  begin perform faits_conditions_pilote(); raise exception 'CO01 : référent lit les faits';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select pg_temp.connecter('55555555-5555-4555-8555-555555555555');
set role authenticated;
do $$ declare f record; begin
  select * into f from faits_conditions_pilote();
  assert f.chapitres_pilote = 0 and f.familles_pilote = 0, 'CO01 : aucun chapitre du pilote';
  perform definir_chapitres_pilote('xx-n4-maths', '{c1,c2}', 'empreinte-admin');
  select * into f from faits_conditions_pilote();
  assert f.chapitres_pilote = 2, 'CO01 : deux chapitres du pilote';
  assert f.chapitres_prets <= 1, 'CO01 : un chapitre à valider n''est jamais prêt';
  assert f.familles_pilote = 1 and f.familles_sans_referent = 0, 'CO01 : famille avec référent';
end $$;
reset role;
-- Les référents de maths perdent leur rôle (le temps d'une transaction) : la famille n'a plus de référent.
begin;
update profils p set role = 'parent' from referents_familles rf
where rf.referent_id = p.id and rf.famille = 'mathematiques' and rf.referentiel_id = '00000000-0000-0000-0000-0000000000a1';
set local role authenticated;
do $$ declare f record; begin
  select * into f from faits_conditions_pilote();
  assert f.familles_sans_referent = 1, 'CO01 : famille sans référent';
end $$;
rollback;
do $$ begin
  assert (select role from profils where id = '33333333-3333-3333-3333-333333333333') = 'referent', 'CO01 : rôle rétabli';
end $$;

-- CO02 Coche avec preuve datée : contrôlée, tracée ; les conditions 3 et 4 ne se cochent pas.
select pg_temp.connecter('33333333-3333-3333-3333-333333333333');
set role authenticated;
do $$ begin
  begin perform cocher_condition_pilote(1, 'Avis reçu', current_date, 'x'); raise exception 'CO02 : référent coche';
  exception when insufficient_privilege then null; end;
  begin perform 1 from conditions_pilote; raise exception 'CO02 : table lisible';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select pg_temp.connecter('55555555-5555-4555-8555-555555555555');
set role authenticated;
do $$ begin
  begin perform cocher_condition_pilote(3, 'Référent actif', current_date, 'x'); raise exception 'CO02 : condition 3 cochée';
  exception when invalid_parameter_value then null; end;
  begin perform cocher_condition_pilote(13, 'Inconnue', current_date, 'x'); raise exception 'CO02 : condition 13';
  exception when invalid_parameter_value then null; end;
  begin perform cocher_condition_pilote(1, 'ok', current_date, 'x'); raise exception 'CO02 : preuve trop courte';
  exception when invalid_parameter_value then null; end;
  begin perform cocher_condition_pilote(1, 'Avis reçu', current_date + 30, 'x'); raise exception 'CO02 : date future';
  exception when invalid_parameter_value then null; end;
  perform cocher_condition_pilote(1, 'Avis écrit du juriste (fictif)', current_date - 2, 'empreinte-admin');
  perform cocher_condition_pilote(1, '  Avis écrit du juriste, version 2 (fictif)  ', current_date, 'empreinte-admin');
  perform cocher_condition_pilote(9, 'Équipe de veille nommée (fictif)', current_date, 'empreinte-admin');
  assert (select count(*) from conditions_pilote_cochees()) = 2, 'CO02 : deux conditions cochées';
  assert (select preuve from conditions_pilote_cochees() where numero = 1)
         = 'Avis écrit du juriste, version 2 (fictif)', 'CO02 : preuve mise à jour';
  begin perform decocher_condition_pilote(9, '', 'x'); raise exception 'CO02 : retrait sans motif';
  exception when invalid_parameter_value then null; end;
  assert decocher_condition_pilote(9, 'Équipe changée', 'empreinte-admin'), 'CO02 : retrait';
  assert not decocher_condition_pilote(9, 'Équipe changée', 'empreinte-admin'), 'CO02 : déjà retirée';
end $$;
reset role;
do $$ begin
  assert (select count(*) from journal_audit where action = 'condition_pilote_cochee') = 3, 'CO02 : audit des coches';
  assert (select count(*) from journal_audit where action = 'condition_pilote_decochee') = 1, 'CO02 : audit du retrait';
end $$;

delete from conditions_pilote;
delete from chapitres_pilote;

\o
\echo 'OK CO01 faits du pilote vérifiés en base, en nombres, pour l''administration seulement'
\echo 'OK CO02 conditions cochées avec une preuve datée, contrôlées et tracées ; 3 et 4 automatiques'
