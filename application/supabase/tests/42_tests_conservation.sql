-- Tests de la conservation, de la purge et de la suppression (après import du pack fictif « yy »).
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

-- Comptes fictifs du pays « yy » : A actif récent, B inscription non confirmée depuis 10 jours,
-- C inactif depuis 400 jours, D inscription non confirmée d'hier.
insert into auth.users (id) values
  ('a0000000-0000-4000-8000-00000000000a'), ('b0000000-0000-4000-8000-00000000000b'),
  ('c0000000-0000-4000-8000-00000000000c'), ('d0000000-0000-4000-8000-00000000000d');
insert into profils (id, role, prenom_ou_pseudo, cree_le, derniere_activite) values
  ('a0000000-0000-4000-8000-00000000000a', 'eleve', 'A', now() - interval '500 days', now()),
  ('b0000000-0000-4000-8000-00000000000b', 'eleve', 'B', now() - interval '10 days', null),
  ('c0000000-0000-4000-8000-00000000000c', 'eleve', 'C', now() - interval '800 days', now() - interval '400 days'),
  ('d0000000-0000-4000-8000-00000000000d', 'eleve', 'D', now() - interval '1 day', null);
insert into eleves (id, referentiel_id, niveau_id, est_mineur, statut)
select v.id::uuid, r.id, n.id, true, v.statut::statut_compte
from (values ('a0000000-0000-4000-8000-00000000000a', 'actif'), ('b0000000-0000-4000-8000-00000000000b', 'en_attente_parent'),
             ('c0000000-0000-4000-8000-00000000000c', 'actif'), ('d0000000-0000-4000-8000-00000000000d', 'en_attente_parent')) v(id, statut),
     referentiels r join niveaux n on n.referentiel_id = r.id and n.code = 'grade-7'
where r.code = 'yy-general';
insert into echanges_professeur (eleve_id, chapitre_id, auteur, contenu, cree_le)
select e, c.id, 'eleve', t, d
from (values ('a0000000-0000-4000-8000-00000000000a'::uuid, 'Ancien', now() - interval '100 days'),
             ('a0000000-0000-4000-8000-00000000000a'::uuid, 'Récent', now() - interval '1 day'),
             ('c0000000-0000-4000-8000-00000000000c'::uuid, 'De C', now() - interval '10 days')) v(e, t, d),
     chapitres c join unites u on u.id = c.unite_id
where u.code = 'yy-g7-algebre' and c.code = 'equations';
insert into signalements (source, motif, priorite, eleve_id, resume)
values ('agent_professeur', 'autre', 3, 'c0000000-0000-4000-8000-00000000000c', 'Signalement fictif sur C');

-- P01 Seule l'administration peut lancer la purge.
do $$
declare r text;
begin
  foreach r in array array['authenticated', 'anon', 'agent_professeur', 'serveur_application'] loop
    execute format('set local role %I', r);
    begin
      perform purger_donnees_expirees('yy');
      raise exception 'P01 : le rôle % a lancé la purge', r;
    exception when insufficient_privilege then null;
    end;
    reset role;
  end loop;
end $$;
\echo OK P01 purge réservée à l’administration

-- P02 La purge efface les vieux échanges et désigne B (non confirmé) et C (inactif), pas A ni D.
create temporary table a_supprimer as select compte from purger_donnees_expirees('yy');
do $$ begin
  assert (select array_agg(compte order by compte) from a_supprimer)
    = array['b0000000-0000-4000-8000-00000000000b', 'c0000000-0000-4000-8000-00000000000c']::uuid[],
    'P02 : mauvais comptes désignés par la purge';
  assert not exists (select 1 from echanges_professeur where contenu = 'Ancien'), 'P02 : vieil échange conservé';
  assert exists (select 1 from echanges_professeur where contenu = 'Récent'), 'P02 : échange récent effacé';
end $$;
\echo OK P02 purge selon les durées du pack pays

-- P03 Supprimer le compte d'authentification efface en cascade toutes les données de l'élève ;
-- les signalements le concernant sont anonymisés.
delete from auth.users where id in (select compte from a_supprimer);
do $$ begin
  assert not exists (select 1 from profils where id = 'c0000000-0000-4000-8000-00000000000c'), 'P03 : profil conservé';
  assert not exists (select 1 from eleves where id = 'c0000000-0000-4000-8000-00000000000c'), 'P03 : élève conservé';
  assert not exists (select 1 from echanges_professeur where contenu = 'De C'), 'P03 : échanges conservés';
  assert (select eleve_id from signalements where resume = 'Signalement fictif sur C') is null, 'P03 : signalement non anonymisé';
  assert exists (select 1 from profils where id = 'a0000000-0000-4000-8000-00000000000a'), 'P03 : un autre compte a été supprimé';
end $$;
\echo OK P03 suppression en cascade, signalements anonymisés

-- P04 L'élève connecté note son activité, au plus une fois par jour.
select set_config('request.jwt.claim.sub', 'd0000000-0000-4000-8000-00000000000d', false);
set role authenticated;
select noter_activite();
reset role;
do $$ begin
  assert (select derniere_activite from profils where id = 'd0000000-0000-4000-8000-00000000000d') is not null, 'P04 : activité non notée';
end $$;
\echo OK P04 activité notée
