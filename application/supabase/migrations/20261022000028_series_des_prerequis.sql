-- Jalon 5, étape 4 (ADR 0047) : avec les séries du lycée, un lien de prérequis ne doit jamais renvoyer un élève
-- vers un chapitre d'une autre série. Un prérequis propre à des séries ne vaut que pour un chapitre de ces mêmes
-- séries ; un prérequis sans série (collège, Seconde) vaut pour tous. Contrôlé à la lecture du pack et ici, pour
-- tout lien (import, décision d'un référent, proposition du Coordinateur acceptée).
create function series_compatibles(p_chapitre uuid, p_prerequis uuid) returns boolean
language sql stable security definer
set search_path = pg_catalog, public
as $$
  with sp as (
    select us.serie_id from chapitres c join unites_series us on us.unite_id = c.unite_id where c.id = p_prerequis
  ), sc as (
    select us.serie_id from chapitres c join unites_series us on us.unite_id = c.unite_id where c.id = p_chapitre
  )
  select not exists (select 1 from sp)
    or (exists (select 1 from sc) and not exists (select serie_id from sc except select serie_id from sp))
$$;
revoke execute on function series_compatibles(uuid, uuid) from public, anon, authenticated;

create function prerequis_meme_serie() returns trigger
language plpgsql security definer
set search_path = pg_catalog, public
as $$
begin
  if not series_compatibles(new.chapitre_id, new.prerequis_id) then
    raise exception 'Prérequis d''une autre série.' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke execute on function prerequis_meme_serie() from public, anon, authenticated;
create trigger prerequis_meme_serie before insert or update of chapitre_id, prerequis_id on prerequis_chapitres
  for each row execute function prerequis_meme_serie();
