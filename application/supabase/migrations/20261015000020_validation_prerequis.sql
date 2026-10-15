-- Jalon 4, étape 1 : validation du graphe de prérequis par un enseignant-référent (ADR 0037).
-- Les liens arrivent du pack « à valider » ; seul un référent de la famille des DEUX chapitres décide.
-- Seuls les liens validés servent aux agents (Tuteur, Scénariste, Évaluateur).

alter table prerequis_chapitres
  add column decide_par uuid references profils (id) on delete set null,
  add column decide_le timestamptz,
  add column commentaire text check (char_length(commentaire) <= 1000);

create function decider_prerequis(
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
  if not (est_referent_du_chapitre(p_chapitre) and est_referent_du_chapitre(p_prerequis)) then
    raise exception 'Référent de la famille requis pour les deux chapitres.' using errcode = '42501';
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
revoke execute on function decider_prerequis(uuid, uuid, statut_validation, text) from public, anon;
grant execute on function decider_prerequis(uuid, uuid, statut_validation, text) to authenticated;
