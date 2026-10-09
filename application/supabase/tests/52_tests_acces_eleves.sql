-- Tests de l'interrupteur d'accès des élèves (préparation du pilote). Après 48 (administrateur fictif).
\set ON_ERROR_STOP on
\set QUIET on
\o /dev/null

create function pg_temp.connecter(p_utilisateur text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_utilisateur, false)
$$;
select set_config('app.eleve_id', '', false), set_config('app.unite_id', '', false);

-- A01 Lecture par tous, une seule ligne.
set role anon;
do $$ begin
  assert (select ouvert from acces_eleves), 'A01 : accès fermé par défaut';
end $$;
reset role;
do $$ begin
  begin
    insert into acces_eleves (id) values (false);
    raise exception 'A01 : seconde ligne acceptée';
  exception when check_violation then null;
  end;
end $$;
\echo OK A01 interrupteur lisible par tous, ligne unique

-- A02 Seule l'administration le modifie, en son nom.
select pg_temp.connecter('77777777-7777-4777-8777-777777777777');
set role authenticated;
do $$ begin
  update acces_eleves set ouvert = false, maj_par = auth.uid();
end $$;
reset role;
do $$ begin assert (select ouvert from acces_eleves), 'A02 : fermé par un référent'; end $$;
select pg_temp.connecter('55555555-5555-4555-8555-555555555555');
set role authenticated;
do $$ begin
  begin
    update acces_eleves set ouvert = false, maj_par = '77777777-7777-4777-8777-777777777777';
    raise exception 'A02 : modification attribuée à un autre';
  exception when insufficient_privilege then null;
  end;
  update acces_eleves set ouvert = false, motif = 'Test', maj_le = now(), maj_par = auth.uid();
end $$;
reset role;
do $$ begin assert not (select ouvert from acces_eleves), 'A02 : non fermé par l''administration'; end $$;
update acces_eleves set ouvert = true, motif = null, maj_par = null;
set role anon;
do $$ begin
  begin
    perform motif from acces_eleves;
    raise exception 'A02 : motif lisible par un visiteur';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
\echo OK A02 modification réservée à l administration

\echo TOUS LES TESTS DE L ACCES DES ELEVES SONT PASSÉS
