-- Mot qui désigne les séries d'un pays (Jalon 22, étape 1 ; ADR 0111). Le pilote parle de « séries », le pays
-- fictif Z d'« options » ; d'autres pays de « filières » ou de « sections ». Le mot vient du pack
-- (`appellation_series` de structure.yaml) ; null = mot générique de l'application.
alter table referentiels
  add column appellation_serie text,
  add column appellation_series text,
  add constraint referentiels_appellation_complete
    check ((appellation_serie is null) = (appellation_series is null));

-- La vue de l'enseignant affiche le mot du pays de chaque classe.
drop function mes_classes();
create function mes_classes()
returns table (
  id uuid, nom text, etablissement text, niveau text, serie text, appellation_serie text, appellation_series text
)
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select c.id, c.nom, c.etablissement, n.libelle, s.libelle, r.appellation_serie, r.appellation_series
  from enseignants_classes ec
  join classes c on c.id = ec.classe_id
  join niveaux n on n.id = c.niveau_id
  join referentiels r on r.id = c.referentiel_id
  left join series s on s.id = c.serie_id
  where ec.enseignant_id = auth.uid()
  order by c.etablissement, c.nom
$$;
revoke execute on function mes_classes() from public, anon;
grant execute on function mes_classes() to authenticated;
