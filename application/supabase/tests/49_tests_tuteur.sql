-- Tests du Tuteur côté base (Jalon 3, étape 3). Après 47-48.
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

update profils set derniere_activite = now() - interval '30 days' where id = '22222222-2222-2222-2222-222222222222';
update profils set derniere_activite = now() where id = '11111111-1111-1111-1111-111111111111';

-- T301 Inactivité : jours de l'élève du contexte seulement ; détection sans doublon de signalement.
select set_config('app.eleve_id', '22222222-2222-2222-2222-222222222222', false), set_config('app.unite_id', '', false);
set role agent_tuteur;
do $$ begin
  assert jours_sans_activite() >= 29, 'T301 : jours sans activité';
  assert exists (select 1 from eleves_inactifs(14) where eleve_id = '22222222-2222-2222-2222-222222222222'),
    'T301 : élève inactif non détecté';
  assert not exists (select 1 from eleves_inactifs(14) where eleve_id = '11111111-1111-1111-1111-111111111111'),
    'T301 : élève actif détecté';
  insert into signalements (source, motif, priorite, eleve_id, resume)
  values ('agent_tuteur', 'autre', 2, '22222222-2222-2222-2222-222222222222', 'Décrochage : 30 jours sans activité.');
  assert not exists (select 1 from eleves_inactifs(14) where eleve_id = '22222222-2222-2222-2222-222222222222'),
    'T301 : décrochage signalé deux fois';
  assert (select count(*) from quiz) >= 0, 'T301 : quiz (identifiant, chapitre) lisibles';
  begin
    perform questions from quiz;
    raise exception 'T301 : questions des quiz lisibles par le Tuteur';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
set role authenticated;
do $$ begin
  begin
    perform eleves_inactifs(14);
    raise exception 'T301 : détection accessible à un utilisateur';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
\echo OK T301 inactivité et détection du décrochage réservées au Tuteur

\echo TOUS LES TESTS DU TUTEUR SONT PASSÉS
