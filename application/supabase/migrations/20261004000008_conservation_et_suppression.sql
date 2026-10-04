-- Durée de conservation, suppression et export des données (prompt maître §6, ADR 0019).

-- Durées de conservation propres à chaque pays (cadre légal du pack pays), en jours ; null = pas de purge.
alter table pays add column conservation jsonb not null default '{}'::jsonb;

-- Dernière activité d'un compte, pour supprimer les comptes inactifs.
alter table profils add column derniere_activite timestamptz;

-- Note l'activité du compte connecté (au plus une écriture par jour).
create function noter_activite() returns void
language sql security definer
set search_path = pg_catalog, public
as $$
  update profils set derniere_activite = now()
  where id = auth.uid() and (derniere_activite is null or derniere_activite < now() - interval '1 day')
$$;

/**
 * Purge selon les durées du pays :
 *   - échanges avec le professeur plus anciens que conservation.echanges_jours ;
 * et renvoie les comptes élèves à supprimer (la suppression du compte d'authentification, qui efface
 * en cascade toutes les données de l'élève, est faite par le service d'administration) :
 *   - inscription jamais confirmée par un parent après conservation.inscription_non_confirmee_jours ;
 *   - aucune activité depuis conservation.compte_inactif_jours.
 */
create function purger_donnees_expirees(p_pays text) returns table (compte uuid)
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  v_conservation jsonb := (select conservation from pays where code = p_pays);
  v_echanges int := (v_conservation ->> 'echanges_jours')::int;
  v_non_confirmee int := (v_conservation ->> 'inscription_non_confirmee_jours')::int;
  v_inactif int := (v_conservation ->> 'compte_inactif_jours')::int;
begin
  if v_conservation is null then
    raise exception 'Pays inconnu : %', p_pays using errcode = '22023';
  end if;

  if v_echanges is not null then
    delete from echanges_professeur ep
    using eleves e, referentiels r
    where ep.eleve_id = e.id and r.id = e.referentiel_id and r.pays_code = p_pays
      and ep.cree_le < now() - make_interval(days => v_echanges);
  end if;

  return query
  select p.id
  from profils p
  join eleves e on e.id = p.id
  join referentiels r on r.id = e.referentiel_id
  where r.pays_code = p_pays
    and (
      (v_non_confirmee is not null and e.statut = 'en_attente_parent'
        and p.cree_le < now() - make_interval(days => v_non_confirmee))
      or (v_inactif is not null
        and coalesce(p.derniere_activite, p.cree_le) < now() - make_interval(days => v_inactif))
    );
end;
$$;

revoke execute on function noter_activite(), purger_donnees_expirees(text) from public, anon, authenticated;
grant execute on function noter_activite() to authenticated;
-- purger_donnees_expirees : réservée à l'administration (propriétaire de la base / service), jamais aux agents.
