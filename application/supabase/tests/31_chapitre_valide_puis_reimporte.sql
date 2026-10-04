-- Un chapitre validé puis modifié dans le pack repasse « à valider » au réimport.
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null
update chapitres set statut = 'valide'
where code = 'expressions' and unite_id = (select id from unites where code = 'yy-g7-algebre');
