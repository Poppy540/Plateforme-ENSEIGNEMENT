-- Tests des échanges avec l'agent Professeur.
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

-- E01 L'agent écrit pour l'élève connecté sur un chapitre validé de son unité, pas ailleurs.
set role agent_professeur;
select set_config('app.eleve_id', '11111111-1111-1111-1111-111111111111', false),
       set_config('app.unite_id', '00000000-0000-0000-0000-0000000000e1', false);
do $$ begin
  insert into echanges_professeur (eleve_id, chapitre_id, auteur, contenu)
  values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-0000000000f1', 'eleve', 'Question fictive');
  begin
    insert into echanges_professeur (eleve_id, chapitre_id, auteur, contenu)
    values ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-0000000000f1', 'eleve', 'Autre élève');
    raise exception 'E01 : échange écrit pour un autre élève';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into echanges_professeur (eleve_id, chapitre_id, auteur, contenu)
    values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-0000000000f3', 'eleve', 'Autre unité');
    raise exception 'E01 : échange écrit hors de l''unité';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select set_config('app.eleve_id', '', false), set_config('app.unite_id', '', false);
\echo OK E01 échanges écrits par l’agent dans son périmètre seulement

-- E02 L'élève lit ses échanges ; un autre élève non ; l'élève ne peut pas écrire directement.
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
set role authenticated;
do $$ begin
  assert (select count(*) from echanges_professeur) = 1, 'E02 : l''élève ne lit pas ses échanges';
  begin
    insert into echanges_professeur (eleve_id, chapitre_id, auteur, contenu)
    values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-0000000000f1', 'professeur', 'Faux message');
    raise exception 'E02 : un élève a écrit un faux message du professeur';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
set role authenticated;
do $$ begin
  assert (select count(*) from echanges_professeur) = 0, 'E02 : un élève lit les échanges d''un autre';
end $$;
reset role;
\echo OK E02 lecture personnelle, pas d’écriture directe par l’élève
