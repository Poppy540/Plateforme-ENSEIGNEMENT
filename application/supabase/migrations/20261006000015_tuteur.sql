-- Jalon 3, étape 3 : agent Tuteur (ADR 0030).

-- Relier une tentative à son chapitre (sans lire les questions ni les réponses du quiz).
grant select (id, chapitre_id, statut) on quiz to agent_tuteur;
create policy quiz_tuteur on quiz for select to agent_tuteur using (statut = 'valide');

/** Jours sans activité de l'élève du contexte (le Tuteur ne voit rien d'autre de son compte). */
create function jours_sans_activite() returns integer
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select extract(day from now() - coalesce(p.derniere_activite, p.cree_le))::integer
  from profils p where p.id = contexte_agent('eleve_id')
$$;
revoke execute on function jours_sans_activite() from public, anon, authenticated;
grant execute on function jours_sans_activite() to agent_tuteur;

/**
 * Élèves actifs sans activité depuis p_jours, et pas déjà signalés pour décrochage sur cette période :
 * seulement leurs identifiants (détection planifiée du décrochage, aucun autre renseignement).
 */
create function eleves_inactifs(p_jours integer) returns table (eleve_id uuid, jours integer)
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select e.id, extract(day from now() - coalesce(p.derniere_activite, p.cree_le))::integer
  from eleves e join profils p on p.id = e.id
  where e.statut = 'actif'
    and coalesce(p.derniere_activite, p.cree_le) < now() - make_interval(days => greatest(p_jours, 7))
    and not exists (
      select 1 from signalements s
      where s.eleve_id = e.id and s.source = 'agent_tuteur' and s.resume like 'Décrochage%'
        and s.cree_le > now() - make_interval(days => greatest(p_jours, 7))
    )
$$;
revoke execute on function eleves_inactifs(integer) from public, anon, authenticated;
grant execute on function eleves_inactifs(integer) to agent_tuteur;
