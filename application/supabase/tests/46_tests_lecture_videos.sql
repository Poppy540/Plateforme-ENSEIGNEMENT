-- Tests de la lecture des vidéos (Jalon 2, étape 6). Après 43 : une vidéo publiée sur le chapitre 1 de
-- ga-3e-mathematiques (C06) ; référent fictif 7777… ; élève 1111….
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

create function pg_temp.connecter(p_utilisateur text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_utilisateur, false)
$$;
create temp table ids (cle text primary key, valeur uuid);
grant select on ids to public;
insert into ids
select 'chapitre', c.id from chapitres c join unites u on u.id = c.unite_id
where u.code = 'ga-3e-mathematiques' and c.ordre = 1;

-- L01 Un élève connecté obtient la vidéo publiée (sans les scripts ni le rapport) ; un visiteur, rien.
select pg_temp.connecter('11111111-1111-1111-1111-111111111111');
set role authenticated;
do $$ begin
  assert (select count(*) from videos_publiees_du_chapitre((select valeur from ids where cle = 'chapitre'))) = 1,
    'L01 : vidéo publiée invisible';
  assert (select count(*) from scripts) = 0, 'L01 : scripts lisibles par un élève';
end $$;
reset role;
select pg_temp.connecter('');
set role anon;
do $$ begin
  begin
    perform videos_publiees_du_chapitre((select valeur from ids where cle = 'chapitre'));
    raise exception 'L01 : fonction accessible sans connexion';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
\echo OK L01 vidéo publiée servie aux élèves connectés seulement

-- L02 Une vidéo validée mais non publiée, ou un chapitre repassé à valider : rien n'est servi.
update videos set statut = 'validee'
where id in (select id from videos where statut = 'publiee');
select pg_temp.connecter('11111111-1111-1111-1111-111111111111');
set role authenticated;
do $$ begin
  assert (select count(*) from videos_publiees_du_chapitre((select valeur from ids where cle = 'chapitre'))) = 0,
    'L02 : vidéo non publiée servie';
end $$;
reset role;
update videos set statut = 'publiee' where statut = 'validee';
update chapitres set statut = 'a_valider' where id = (select valeur from ids where cle = 'chapitre');
set role authenticated;
do $$ begin
  assert (select count(*) from videos_publiees_du_chapitre((select valeur from ids where cle = 'chapitre'))) = 0,
    'L02 : vidéo d''un chapitre non validé servie';
end $$;
reset role;
update chapitres set statut = 'valide' where id = (select valeur from ids where cle = 'chapitre');
\echo OK L02 rien sans publication ni chapitre validé

\echo TOUS LES TESTS DE LECTURE DES VIDÉOS SONT PASSÉS
