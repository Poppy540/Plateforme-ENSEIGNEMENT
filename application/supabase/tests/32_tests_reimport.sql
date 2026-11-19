\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null
do $$ begin
  assert (select statut from chapitres where code = 'expressions'
          and unite_id = (select id from unites where code = 'yy-g7-algebre')) = 'a_valider',
    'I03 : un chapitre modifié dans le pack reste validé';
  assert (select version from chapitres where code = 'expressions'
          and unite_id = (select id from unites where code = 'yy-g7-algebre')) = 2,
    'I03 : version non incrémentée';
end $$;
\echo OK I03 un chapitre modifié dans le pack repasse à valider
