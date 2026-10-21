-- Jalon 6, étape 3 (ADR 0050) : liens de prérequis entre deux familles (par exemple Physique-Chimie ← Mathématiques).
-- Décision du propriétaire : un lien entre familles est décidé par le référent de la famille du chapitre qui DÉPEND,
-- seul ; il lit le chapitre visé (titre, sous-thèmes) sans pouvoir le modifier. Dans une même famille, la règle reste :
-- référent de la famille des deux chapitres.

create function famille_du_chapitre(p_chapitre uuid) returns text
language sql stable security definer
set search_path = pg_catalog, public
as $$ select m.famille from chapitres c join unites u on u.id = c.unite_id join matieres m on m.id = u.matiere_id
      where c.id = p_chapitre $$;

/** La personne connectée peut-elle décider de ce lien ? */
create function peut_decider_prerequis(p_chapitre uuid, p_prerequis uuid) returns boolean
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select est_referent_du_chapitre(p_chapitre)
    and (est_referent_du_chapitre(p_prerequis)
         or famille_du_chapitre(p_chapitre) is distinct from famille_du_chapitre(p_prerequis))
$$;

/** Chapitre d'une autre famille, prérequis d'un chapitre de mes familles (lecture seule, pour en décider). */
create function est_prerequis_de_mes_chapitres(p_chapitre uuid) returns boolean
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from prerequis_chapitres p
    where p.prerequis_id = p_chapitre and est_referent_du_chapitre(p.chapitre_id)
      and famille_du_chapitre(p.chapitre_id) is distinct from famille_du_chapitre(p_chapitre)
  )
$$;

create or replace function decider_prerequis(
  p_chapitre uuid,
  p_prerequis uuid,
  p_decision statut_validation,
  p_commentaire text default null
) returns boolean
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare v_n integer;
begin
  if p_decision not in ('valide', 'rejete') then
    raise exception 'Décision inconnue.' using errcode = '22023';
  end if;
  if not peut_decider_prerequis(p_chapitre, p_prerequis) then
    raise exception 'Référent de la famille du chapitre requis.' using errcode = '42501';
  end if;
  if p_decision = 'rejete' and nullif(trim(p_commentaire), '') is null then
    raise exception 'Commentaire obligatoire en cas de rejet.' using errcode = '22023';
  end if;
  update prerequis_chapitres
  set statut = p_decision, decide_par = auth.uid(), decide_le = now(),
      commentaire = nullif(trim(p_commentaire), '')
  where chapitre_id = p_chapitre and prerequis_id = p_prerequis;
  get diagnostics v_n = row_count;
  return v_n > 0;
end;
$$;

create policy chapitres_prerequis_autre_famille on chapitres for select to authenticated
  using (est_prerequis_de_mes_chapitres(id));

revoke execute on function famille_du_chapitre(uuid), peut_decider_prerequis(uuid, uuid),
  est_prerequis_de_mes_chapitres(uuid) from public, anon;
grant execute on function peut_decider_prerequis(uuid, uuid), est_prerequis_de_mes_chapitres(uuid) to authenticated;
revoke execute on function famille_du_chapitre(uuid) from authenticated;
