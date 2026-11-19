-- Tests de l'import des packs pays (après application du pack pilote deux fois et du pack fictif « yy »).
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

do $$
declare v_ref uuid := (select id from referentiels where code = 'ga-general');
begin
  assert v_ref is not null, 'I01 : référentiel du pack pilote absent';
  assert (select count(*) from unites where referentiel_id = v_ref) = 67, 'I01 : nombre d''unités du pack pilote incorrect';
  assert (select count(*) from niveaux where referentiel_id = v_ref) = 7, 'I01 : nombre de niveaux incorrect';
  assert (select count(*) from unites u join unites_series us on us.unite_id = u.id where u.code = 'ga-1re-a-francais') = 2,
    'I01 : l''unité A1/A2 ne couvre pas deux séries';
  assert (select count(*) from chapitres c join unites u on u.id = c.unite_id where u.code = 'ga-3e-mathematiques') = 7,
    'I01 : chapitres du programme pilote absents';
  assert not exists (select 1 from chapitres where statut = 'valide' and unite_id in (select id from unites where referentiel_id = v_ref)),
    'I01 : l''import a validé un chapitre';
end $$;
\echo OK I01 pack pilote importé (sans doublon après deux imports, rien de validé)

do $$
begin
  assert (select count(*) from unites u join referentiels r on r.id = u.referentiel_id where r.code = 'yy-general') = 3,
    'I02 : pack fictif mal importé';
  assert (select series_obligatoires from niveaux n join referentiels r on r.id = n.referentiel_id
          where r.code = 'yy-general' and n.code = 'grade-12'), 'I02 : séries obligatoires non importées';
end $$;
\echo OK I02 pays fictif importé sans modifier le code
