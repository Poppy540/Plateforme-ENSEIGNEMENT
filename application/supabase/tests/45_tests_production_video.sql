-- Tests de la chaîne de production vidéo côté base (Jalon 2, étape 5). Après 43 et 44 : script version 1
-- validé sur le chapitre 1 de ga-3e-mathematiques ; référent fictif 7777… ; élève 1111….
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

create function pg_temp.connecter(p_utilisateur text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_utilisateur, false)
$$;
create temp table ids (cle text primary key, valeur uuid);
grant select on ids to public;
insert into ids
select 'script', s.id from scripts s join chapitres c on c.id = s.chapitre_id join unites u on u.id = c.unite_id
where u.code = 'ga-3e-mathematiques' and s.statut = 'valide' order by s.version limit 1;
insert into ids
select 'brouillon', s.id from scripts s where s.statut = 'brouillon' limit 1;

-- D01 La chaîne lit l'état complet du script validé : empreinte recalculée et validation tracée.
set role agent_production_video;
do $$
declare v record;
begin
  select * into v from script_pour_production((select valeur from ids where cle = 'script'));
  assert v.statut = 'valide', 'D01 : statut';
  assert v.empreinte = v.empreinte_recalculee, 'D01 : empreinte recalculée';
  assert v.version_validee = v.version and v.empreinte_validee = v.empreinte, 'D01 : validation tracée';
  select * into v from script_pour_production((select valeur from ids where cle = 'brouillon'));
  assert v.version_validee is null, 'D01 : un brouillon n''a pas de validation';
end $$;
reset role;
select pg_temp.connecter('11111111-1111-1111-1111-111111111111');
set role authenticated;
do $$ begin
  begin
    perform script_pour_production((select valeur from ids where cle = 'script'));
    raise exception 'D01 : fonction de production appelée par un utilisateur';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
\echo OK D01 état du script pour la production réservé à la chaîne

-- D02 Autorisations voix/visage : enregistrées hors des agents, lues seulement par la fonction de contrôle.
insert into autorisations_image_voix (id, personne, usage, document_reference, accordee_le)
values ('00000000-0000-4000-8000-0000000000a1', 'Personne fictive', 'voix', 'document-fictif-1', current_date);
set role agent_production_video;
do $$ begin
  assert autorisation_active('00000000-0000-4000-8000-0000000000a1', 'voix'), 'D02 : autorisation active';
  assert not autorisation_active('00000000-0000-4000-8000-0000000000a1', 'visage'), 'D02 : autre usage';
  begin
    perform 1 from autorisations_image_voix;
    raise exception 'D02 : registre lisible par la chaîne';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into autorisations_image_voix (personne, usage, document_reference, accordee_le)
    values ('Moi', 'voix', 'faux', current_date);
    raise exception 'D02 : autorisation créée par la chaîne';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
update autorisations_image_voix set revoquee_le = now() where id = '00000000-0000-4000-8000-0000000000a1';
set role agent_production_video;
do $$ begin
  assert not autorisation_active('00000000-0000-4000-8000-0000000000a1', 'voix'), 'D02 : autorisation révoquée';
end $$;
reset role;
\echo OK D02 autorisations voix et visage enregistrées, révocables, hors de portée des agents

-- D03 Journal de production : écrit par la chaîne, lu par les référents de la famille, pas par les élèves.
set role agent_production_video;
do $$ begin
  insert into journal_production_video (script_id, script_version, resultat, cout_usd, rapport)
  values ((select valeur from ids where cle = 'script'), 1, 'arretee', 1.25, '{"escalades": ["test"]}');
  insert into signalements (source, motif, priorite, chapitre_id, resume)
  select 'agent_production_video', 'autre', 2, chapitre_id, 'Budget dépassé (test).'
  from scripts where id = (select valeur from ids where cle = 'script');
  begin
    insert into signalements (source, motif, priorite, eleve_id, resume)
    values ('agent_production_video', 'autre', 2, '11111111-1111-1111-1111-111111111111', 'Avec un élève');
    raise exception 'D03 : signalement de la chaîne lié à un élève';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select pg_temp.connecter('77777777-7777-4777-8777-777777777777');
set role authenticated;
do $$ begin
  assert (select count(*) from journal_production_video) = 1, 'D03 : le référent ne voit pas le journal';
  begin
    insert into journal_production_video (script_id, script_version, resultat, cout_usd, rapport)
    values ((select valeur from ids where cle = 'script'), 1, 'deposee', 0, '{}');
    raise exception 'D03 : journal écrit par un référent';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select pg_temp.connecter('11111111-1111-1111-1111-111111111111');
set role authenticated;
do $$ begin
  assert (select count(*) from journal_production_video) = 0, 'D03 : journal visible par un élève';
end $$;
reset role;
\echo OK D03 journal et alertes de production

\echo TOUS LES TESTS DE PRODUCTION VIDÉO SONT PASSÉS
