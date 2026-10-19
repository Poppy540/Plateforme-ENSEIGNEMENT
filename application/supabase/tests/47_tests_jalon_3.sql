-- Tests des droits du Jalon 3 (Tuteur, Support/inscription, Orchestrateur). Données fictives :
-- élèves 1111… et 2222…, référent fictif 7777….
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

create function pg_temp.connecter(p_utilisateur text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_utilisateur, false)
$$;
create function pg_temp.eleve(p_eleve text) returns void language sql as $$
  select set_config('app.eleve_id', coalesce(p_eleve, ''), false), set_config('app.unite_id', '', false)
$$;
insert into progression (eleve_id, chapitre_id, statut, score)
select '22222222-2222-2222-2222-222222222222', id, 'en_cours', 40 from chapitres where statut = 'valide' limit 1
on conflict do nothing;

-- J01 Préférences : chaque élève les siennes ; rappels désactivés par défaut.
select pg_temp.connecter('11111111-1111-1111-1111-111111111111');
set role authenticated;
do $$ begin
  insert into preferences_eleves (eleve_id, minutes_par_jour, connexion)
  values ('11111111-1111-1111-1111-111111111111', 30, 'lente');
  assert (select rappels_actifs from preferences_eleves) = false, 'J01 : rappels actifs par défaut';
  begin
    insert into preferences_eleves (eleve_id) values ('22222222-2222-2222-2222-222222222222');
    raise exception 'J01 : préférences d''un autre élève';
  exception when insufficient_privilege then null;
  end;
  update preferences_eleves set rappels_actifs = true, frequence_rappels = 'quotidienne';
end $$;
reset role;
\echo OK J01 préférences personnelles, rappels désactivés par défaut

-- J02 Tuteur : seulement l'élève du contexte ; trois priorités au plus.
select pg_temp.eleve('11111111-1111-1111-1111-111111111111');
set role agent_tuteur;
do $$ begin
  assert (select count(*) from progression where eleve_id = '22222222-2222-2222-2222-222222222222') = 0,
    'J02 : progression d''un autre élève lisible';
  assert (select count(*) from preferences_eleves) = 1, 'J02 : préférences de l''élève illisibles';
  insert into recommandations_tuteur (eleve_id, priorites, message)
  values ('11111111-1111-1111-1111-111111111111', '[{"chapitre": "x"}]', 'Plan fictif.');
  begin
    insert into recommandations_tuteur (eleve_id, priorites, message)
    values ('11111111-1111-1111-1111-111111111111', '[1, 2, 3, 4]', 'Trop de priorités.');
    raise exception 'J02 : quatre priorités acceptées';
  exception when check_violation then null;
  end;
  begin
    insert into recommandations_tuteur (eleve_id, priorites, message)
    values ('22222222-2222-2222-2222-222222222222', '[]', 'Autre élève.');
    raise exception 'J02 : recommandation pour un autre élève';
  exception when insufficient_privilege then null;
  end;
  begin
    update recommandations_tuteur set message = 'modifié';
    raise exception 'J02 : recommandation modifiée';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
\echo OK J02 Tuteur limité à l élève du contexte, trois priorités au plus

-- J03 Rapports aux parents : jamais sans consentement « rapport_parents » actif (celui de l'inscription ne suffit pas).
insert into consentements (id, eleve_id, type, contact_parent, demande_le, accorde_le)
values ('00000000-0000-4000-8000-0000000000c0', '11111111-1111-1111-1111-111111111111', 'inscription',
  '+999 000 000 99', now() - interval '2 days', now() - interval '2 days');
set role agent_tuteur;
do $$ begin
  begin
    insert into rapports_parents (eleve_id, consentement_id, periode, contenu)
    values ('11111111-1111-1111-1111-111111111111', '00000000-0000-4000-8000-0000000000c0', 'hebdomadaire', '{}');
    raise exception 'J03 : rapport avec le seul consentement d''inscription';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
insert into consentements (id, eleve_id, type, contact_parent, demande_le, accorde_le)
values ('00000000-0000-4000-8000-0000000000c1', '11111111-1111-1111-1111-111111111111', 'rapport_parents',
  '+999 000 000 99', now(), now());
set role agent_tuteur;
do $$ begin
  insert into rapports_parents (eleve_id, consentement_id, periode, contenu)
  values ('11111111-1111-1111-1111-111111111111', '00000000-0000-4000-8000-0000000000c1', 'hebdomadaire', '{}');
  begin
    perform contact_parent from consentements;
    raise exception 'J03 : contact du parent lisible par le Tuteur';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
update consentements set revoque_le = now() where id = '00000000-0000-4000-8000-0000000000c1';
set role agent_tuteur;
do $$ begin
  begin
    insert into rapports_parents (eleve_id, consentement_id, periode, contenu)
    values ('11111111-1111-1111-1111-111111111111', '00000000-0000-4000-8000-0000000000c1', 'a_la_demande', '{}');
    raise exception 'J03 : rapport après révocation';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
\echo OK J03 rapports aux parents seulement avec consentement actif

-- J04 Support : tickets pour l'utilisateur du contexte ; détresse toujours en priorité 1.
set role agent_support;
do $$ begin
  insert into tickets_support (demandeur_id, categorie, priorite, resume)
  values ('11111111-1111-1111-1111-111111111111', 'detresse', 3, 'Message inquiétant (fictif).');
  assert (select priorite from tickets_support where categorie = 'detresse') = 1, 'J04 : priorité de la détresse';
  begin
    insert into tickets_support (demandeur_id, categorie, priorite, resume)
    values ('22222222-2222-2222-2222-222222222222', 'autre', 3, 'Autre utilisateur');
    raise exception 'J04 : ticket pour un autre utilisateur';
  exception when insufficient_privilege then null;
  end;
  assert (select count(*) from eleves) = 1, 'J04 : le Support voit d''autres élèves';
  begin
    perform 1 from progression;
    raise exception 'J04 : le Support lit la progression';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
\echo OK J04 Support limité à l utilisateur du contexte, détresse prioritaire

-- J05 Orchestrateur : tâches, suspension sans réactivation, audit ; aucun accès aux contenus ni aux élèves.
select pg_temp.eleve(null);
set role agent_orchestrateur;
do $$ begin
  insert into taches (type, agent, entrees, priorite) values ('production_video', 'production_video', '{}', 2);
  update etat_agents set suspendu = true, motif = 'Coût anormal (test)' where agent = 'scenariste';
  begin
    update etat_agents set suspendu = false where agent = 'scenariste';
    raise exception 'J05 : agent réactivé par l''Orchestrateur';
  exception when insufficient_privilege then null;
  end;
  insert into journal_audit (acteur, action, objet_type) values ('agent_orchestrateur', 'suspension', 'agent');
  assert (select count(*) from approbations) > 0, 'J05 : approbations illisibles';
  begin
    perform contenu from scripts;
    raise exception 'J05 : contenu des scripts lisible';
  exception when insufficient_privilege then null;
  end;
  begin
    perform resume from signalements;
    raise exception 'J05 : texte des signalements lisible';
  exception when insufficient_privilege then null;
  end;
  begin
    perform 1 from eleves;
    raise exception 'J05 : élèves lisibles';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
update etat_agents set suspendu = false, motif = null where agent = 'scenariste';
\echo OK J05 Orchestrateur : file, suspension, audit, sans accès aux contenus ni aux élèves

\echo TOUS LES TESTS DU JALON 3 SONT PASSÉS
