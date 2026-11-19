-- Liens de prérequis entre familles (Jalon 6, étape 3 ; ADR 0050). Après 40 (référent Maths 7777…) et l'import du pack.
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

create function pg_temp.connecter(p_utilisateur text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_utilisateur, false)
$$;
create function pg_temp.chapitre(p_ref text) returns uuid language sql as $$
  select c.id from chapitres c join unites u on u.id = c.unite_id where u.code || '/' || c.code = p_ref
$$;
grant execute on function pg_temp.chapitre(text) to public;

-- M01 Le pack Sciences 3e est importé « à valider » : 2 unités, 9 chapitres, 15 liens dont 6 vers les Mathématiques.
do $$ begin
  assert (select count(*) from chapitres c join unites u on u.id = c.unite_id
          where u.code in ('ga-3e-svt', 'ga-3e-physique-chimie') and c.statut = 'a_valider') = 9, 'M01 : chapitres';
  assert (select count(*) from prerequis_chapitres p join chapitres c on c.id = p.chapitre_id join unites u on u.id = c.unite_id
          where u.code in ('ga-3e-svt', 'ga-3e-physique-chimie')) = 15, 'M01 : liens';
  assert (select count(*) from prerequis_chapitres p join chapitres c on c.id = p.prerequis_id join unites u on u.id = c.unite_id
          join chapitres d on d.id = p.chapitre_id join unites ud on ud.id = d.unite_id
          where ud.code in ('ga-3e-svt', 'ga-3e-physique-chimie') and u.code like '%-mathematiques') = 6,
    'M01 : liens vers les Mathématiques';
end $$;
\echo OK M01 Sciences 3e importées à valider

-- Référent Sciences fictif.
insert into auth.users (id) values ('62626262-6262-4262-8262-626262626201');
insert into profils (id, role, prenom_ou_pseudo) values ('62626262-6262-4262-8262-626262626201', 'referent', 'Référent sciences fictif');
insert into referents_familles (referent_id, referentiel_id, famille)
select '62626262-6262-4262-8262-626262626201', id, 'sciences' from referentiels where code = 'ga-general';

-- M02 Lien entre familles : décidé par le référent du chapitre qui dépend, qui lit le chapitre de Maths visé ;
-- le référent de Maths ne décide pas d'un lien d'un chapitre de Sciences.
select pg_temp.connecter('77777777-7777-4777-8777-777777777777');
set role authenticated;
do $$ begin
  begin
    perform decider_prerequis(pg_temp.chapitre('ga-3e-physique-chimie/electricite'),
                              pg_temp.chapitre('ga-4e-mathematiques/equations-premier-degre'), 'valide');
    raise exception 'M02 : lien de Sciences décidé par le référent de Maths';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select pg_temp.connecter('62626262-6262-4262-8262-626262626201');
set role authenticated;
do $$ begin
  assert (select titre from chapitres where id = pg_temp.chapitre('ga-4e-mathematiques/equations-premier-degre')) is not null,
    'M02 : chapitre de Maths visé illisible';
  assert decider_prerequis(pg_temp.chapitre('ga-3e-physique-chimie/electricite'),
                           pg_temp.chapitre('ga-4e-mathematiques/equations-premier-degre'), 'valide'), 'M02 : décision';
  assert decider_prerequis(pg_temp.chapitre('ga-3e-svt/evolution'),
                           pg_temp.chapitre('ga-3e-svt/genetique-heredite'), 'valide'), 'M02 : lien de la famille';
end $$;
\echo OK M02 lien entre familles décidé par le référent du chapitre

-- M03 Le référent de Sciences ne décide pas d'un lien entre deux chapitres de Maths, ne lit pas un chapitre de Maths
-- à valider qui n'est le prérequis d'aucun de ses chapitres, et ne valide pas un chapitre de Maths.
do $$ begin
  begin
    perform decider_prerequis(pg_temp.chapitre('ga-3e-mathematiques/thales'),
                              pg_temp.chapitre('ga-4e-mathematiques/triangles-semblables'), 'rejete', 'non');
    raise exception 'M03 : lien de Maths décidé';
  exception when insufficient_privilege then null; end;
  assert not exists (select 1 from chapitres c where c.id = pg_temp.chapitre('ga-4e-mathematiques/translations')
                     and c.statut <> 'valide'), 'M03 : chapitre de Maths sans lien lisible';
  assert not est_referent_du_chapitre(pg_temp.chapitre('ga-4e-mathematiques/equations-premier-degre')), 'M03 : référent de Maths';
end $$;
reset role;
do $$ begin
  assert (select decide_par from prerequis_chapitres
          where chapitre_id = pg_temp.chapitre('ga-3e-physique-chimie/electricite')
            and prerequis_id = pg_temp.chapitre('ga-4e-mathematiques/equations-premier-degre'))
         = '62626262-6262-4262-8262-626262626201', 'M03 : décision non tracée';
end $$;
\echo OK M03 rien hors de son périmètre

\o
\echo TOUS LES TESTS DES LIENS ENTRE FAMILLES SONT PASSÉS
