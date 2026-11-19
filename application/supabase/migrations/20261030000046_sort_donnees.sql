-- Sort des données en fin de pilote (Jalon 14, étape 3 ; ADR 0086). SIMULATION SEULEMENT : cette fonction ne fait
-- que compter, avec les mêmes règles que les purges existantes (purger_donnees_expirees, purger_donnees_etendues ;
-- ADR 0019, 0049). Elle n'efface rien ; la seule suppression reste la purge planifiée, selon des durées validées
-- par le juriste. Aucune donnée individuelle : des nombres par catégorie.

create function simulation_sort_donnees(p_pays text) returns table (
  categorie text, duree_jours integer, total integer, a_effacer integer
)
language plpgsql stable security definer
set search_path = pg_catalog, public
as $$
declare
  v_conservation jsonb;
  v_jours integer;
begin
  perform verifier_administrateur();
  v_conservation := (select conservation from pays where code = p_pays);
  if v_conservation is null then
    raise exception 'Pays inconnu.' using errcode = '22023';
  end if;

  v_jours := (v_conservation ->> 'echanges_jours')::int;
  categorie := 'echanges'; duree_jours := v_jours;
  select count(*)::int, count(*) filter (where v_jours is not null and ep.cree_le < now() - make_interval(days => v_jours))::int
    into total, a_effacer
  from echanges_professeur ep join eleves e on e.id = ep.eleve_id join referentiels r on r.id = e.referentiel_id
  where r.pays_code = p_pays;
  return next;

  v_jours := (v_conservation ->> 'inscription_non_confirmee_jours')::int;
  categorie := 'inscriptions_non_confirmees'; duree_jours := v_jours;
  select count(*)::int, count(*) filter (where v_jours is not null and p.cree_le < now() - make_interval(days => v_jours))::int
    into total, a_effacer
  from profils p join eleves e on e.id = p.id join referentiels r on r.id = e.referentiel_id
  where r.pays_code = p_pays and e.statut = 'en_attente_parent';
  return next;

  v_jours := (v_conservation ->> 'compte_inactif_jours')::int;
  categorie := 'comptes_inactifs'; duree_jours := v_jours;
  select count(*)::int,
         count(*) filter (where v_jours is not null
                          and coalesce(p.derniere_activite, p.cree_le) < now() - make_interval(days => v_jours))::int
    into total, a_effacer
  from profils p join eleves e on e.id = p.id join referentiels r on r.id = e.referentiel_id
  where r.pays_code = p_pays;
  return next;

  v_jours := (v_conservation ->> 'signalements_traites_jours')::int;
  categorie := 'signalements_traites'; duree_jours := v_jours;
  select count(*)::int, count(*) filter (where v_jours is not null and s.traite_le < now() - make_interval(days => v_jours))::int
    into total, a_effacer
  from signalements s where s.pays_code = p_pays and s.traite_le is not null;
  return next;

  v_jours := (v_conservation ->> 'tickets_resolus_jours')::int;
  categorie := 'tickets_resolus'; duree_jours := v_jours;
  select count(*)::int, count(*) filter (where v_jours is not null and t.traite_le < now() - make_interval(days => v_jours))::int
    into total, a_effacer
  from tickets_support t where t.pays_code = p_pays and t.statut = 'resolu';
  return next;

  v_jours := (v_conservation ->> 'rapports_parents_jours')::int;
  categorie := 'rapports_parents'; duree_jours := v_jours;
  select count(*)::int, count(*) filter (where v_jours is not null and rp.cree_le < now() - make_interval(days => v_jours))::int
    into total, a_effacer
  from rapports_parents rp join eleves e on e.id = rp.eleve_id join referentiels r on r.id = e.referentiel_id
  where r.pays_code = p_pays;
  return next;

  v_jours := (v_conservation ->> 'recrutement_clos_jours')::int;
  categorie := 'candidats_clos'; duree_jours := v_jours;
  select count(*)::int, count(*) filter (where v_jours is not null and c.maj_le < now() - make_interval(days => v_jours))::int
    into total, a_effacer
  from candidats c join referentiels r on r.id = c.referentiel_id
  where r.pays_code = p_pays and c.statut in ('refus', 'suppression_demandee');
  return next;
end;
$$;
revoke execute on function simulation_sort_donnees(text) from public, anon;
grant execute on function simulation_sort_donnees(text) to authenticated;
