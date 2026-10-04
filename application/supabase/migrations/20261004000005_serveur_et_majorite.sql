-- Rôle de connexion du serveur de l'application et âge de la majorité par pays.

-- Le serveur se connecte avec ce rôle, qui n'a aucun droit propre : pour chaque requête, il prend le rôle
-- « anon » ou « authenticated » avec l'identité de l'utilisateur, et les règles d'accès s'appliquent.
-- L'identifiant de connexion (mot de passe) est créé à part par le propriétaire, jamais dans le dépôt.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'serveur_application') then
    create role serveur_application nologin noinherit;
  end if;
end;
$$;
grant anon, authenticated to serveur_application;

-- Âge de la majorité (cadre légal du pays). Inconnu = tout élève est traité comme mineur.
alter table pays add column age_majorite smallint check (age_majorite is null or age_majorite between 10 and 25);
