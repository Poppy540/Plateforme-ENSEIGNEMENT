-- Files d'approbation du référent (Jalon 11, étape 2 ; ADR 0071) : les chapitres du pilote passent en tête de
-- chaque file (chapitres, liens, scripts, quiz, vidéos), et le Coordinateur sait lesquels ils sont.

/** Le chapitre fait-il partie du pilote ? (rien d'autre n'est révélé). */
create function est_chapitre_pilote(p_chapitre uuid) returns boolean
language sql stable security definer
set search_path = pg_catalog, public
as $$ select exists (select 1 from chapitres_pilote where chapitre_id = p_chapitre) $$;
revoke execute on function est_chapitre_pilote(uuid) from public, anon;
grant execute on function est_chapitre_pilote(uuid) to authenticated, agent_coordinateur;

grant select on chapitres_pilote to agent_coordinateur;
create policy chapitres_pilote_coordinateur on chapitres_pilote for select to agent_coordinateur using (true);
