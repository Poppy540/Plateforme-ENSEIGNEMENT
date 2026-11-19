-- Tests de l'accès référent par invitation (après import du pack pilote).
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

create function pg_temp.connecter(p_utilisateur text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_utilisateur, false)
$$;

insert into invitations_referents (empreinte_code, referentiel_id, familles, expire_le)
select encode(sha256(convert_to('TEST-CODE-0001', 'UTF8')), 'hex'), id, array['mathematiques'], now() + interval '1 day'
from referentiels where code = 'ga-general';
insert into invitations_referents (empreinte_code, referentiel_id, familles, expire_le)
select encode(sha256(convert_to('TEST-CODE-EXPI', 'UTF8')), 'hex'), id, array['mathematiques'], now() - interval '1 day'
from referentiels where code = 'ga-general';
insert into auth.users (id) values ('77777777-7777-4777-8777-777777777777');

-- R01 Personne ne lit les invitations, même connecté.
select pg_temp.connecter('77777777-7777-4777-8777-777777777777');
set role authenticated;
do $$ begin
  begin
    perform 1 from invitations_referents;
    raise exception 'R01 : invitations lisibles';
  exception when insufficient_privilege then null;
  end;
end $$;

-- R02 Code faux ou expiré refusé ; code valide (saisi en minuscules) accepté une seule fois.
do $$ begin
  begin
    perform activer_referent('FAUX-CODE-0000', 'Prof');
    raise exception 'R02 : faux code accepté';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform activer_referent('TEST-CODE-EXPI', 'Prof');
    raise exception 'R02 : code expiré accepté';
  exception when invalid_parameter_value then null;
  end;
  perform activer_referent(' test-code-0001 ', 'Prof fictif');
  assert (select role from profils where id = auth.uid()) = 'referent', 'R02 : profil référent non créé';
  assert (select count(*) from referents_familles where referent_id = auth.uid()) = 1, 'R02 : famille non attribuée';
end $$;
reset role;
\echo OK R01-R02 invitation lue par personne, code faux ou expiré refusé, bon code accepté

-- R03 Le code ne sert qu'une fois ; un élève ne peut pas devenir référent avec son compte.
select pg_temp.connecter('11111111-1111-1111-1111-111111111111');
set role authenticated;
do $$ begin
  begin
    perform activer_referent('TEST-CODE-0001', 'Autre');
    raise exception 'R03 : code réutilisé';
  exception when invalid_parameter_value then null;
  end;
end $$;
reset role;
insert into invitations_referents (empreinte_code, referentiel_id, familles, expire_le)
select encode(sha256(convert_to('TEST-CODE-0002', 'UTF8')), 'hex'), id, array['sciences'], now() + interval '1 day'
from referentiels where code = 'ga-general';
set role authenticated;
do $$ begin
  begin
    perform activer_referent('TEST-CODE-0002', 'Élève');
    raise exception 'R03 : un élève est devenu référent';
  exception when invalid_parameter_value then null;
  end;
end $$;
reset role;
\echo OK R03 code à usage unique, pas de compte élève promu

-- R04 Le nouveau référent voit et valide les chapitres de sa famille, pas les autres.
select pg_temp.connecter('77777777-7777-4777-8777-777777777777');
set role authenticated;
do $$
declare v_maths uuid; v_version int;
begin
  select c.id, c.version into v_maths, v_version from chapitres c join unites u on u.id = c.unite_id
  where u.code = 'ga-3e-mathematiques' and c.ordre = 1;
  assert v_maths is not null, 'R04 : chapitre de maths à valider invisible pour le référent';
  begin
    perform valider_chapitre(v_maths, 'valide', null, 'Sans version');
    raise exception 'R04 : validation sans version relue acceptée';
  exception when serialization_failure then null;
  end;
  perform valider_chapitre(v_maths, 'valide', v_version, 'Relu');
  assert (select count(*) from approbations where objet_id = v_maths) = 1, 'R04 : validation non tracée';
  assert (select count(*) from profils where role = 'referent') >= 1, 'R04 : le référent ne voit pas les valideurs';
end $$;
reset role;
\echo OK R04 le référent valide dans sa famille

\echo TOUS LES TESTS RÉFÉRENTS SONT PASSÉS
