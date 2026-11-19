-- Règles d'accès (sécurité au niveau des lignes) et rôle restreint de l'agent Professeur.
-- Principe : tout est fermé, puis on ouvre le strict nécessaire. Les écritures sensibles passent par des fonctions.

-- ---------------------------------------------------------------------------
-- Rôle de l'agent Professeur (moindre privilège, sans connexion directe ;
-- l'identifiant de connexion est créé à part, avec une clé propre à l'agent).
-- Le serveur fixe, pour chaque transaction, l'élève connecté et l'unité :
--   set_config('app.eleve_id', ..., true) et set_config('app.unite_id', ..., true).
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'agent_professeur') then
    create role agent_professeur nologin noinherit;
  end if;
end;
$$;

create function contexte_agent(p_cle text) returns uuid
language sql stable
set search_path = pg_catalog, public
as $$
  select nullif(current_setting('app.' || p_cle, true), '')::uuid
$$;

-- Chapitres que l'agent Professeur peut lire : chapitres validés de son unité et leurs prérequis validés.
create function chapitre_accessible_agent(p_chapitre_id uuid) returns boolean
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from chapitres c
    where c.id = p_chapitre_id and c.statut = 'valide'
      and (
        c.unite_id = contexte_agent('unite_id')
        or exists (
          select 1
          from prerequis_chapitres p
          join chapitres source on source.id = p.chapitre_id
          where p.prerequis_id = c.id and p.statut = 'valide'
            and source.unite_id = contexte_agent('unite_id')
        )
      )
  )
$$;

-- ---------------------------------------------------------------------------
-- Activation de la sécurité au niveau des lignes sur toutes les tables.
-- ---------------------------------------------------------------------------
alter table pays enable row level security;
alter table referentiels enable row level security;
alter table niveaux enable row level security;
alter table series enable row level security;
alter table matieres enable row level security;
alter table unites enable row level security;
alter table unites_series enable row level security;
alter table chapitres enable row level security;
alter table prerequis_chapitres enable row level security;
alter table profils enable row level security;
alter table eleves enable row level security;
alter table consentements enable row level security;
alter table referents_familles enable row level security;
alter table progression enable row level security;
alter table approbations enable row level security;
alter table signalements enable row level security;

-- Tout fermer, puis ouvrir.
revoke all on all tables in schema public from anon, authenticated, agent_professeur;
revoke execute on all functions in schema public from public, anon, authenticated, agent_professeur;
grant usage on schema public to agent_professeur;

-- ---------------------------------------------------------------------------
-- Catalogue : lisible par tous (visiteurs et comptes) ; seuls les chapitres validés sont visibles,
-- sauf pour l'enseignant-référent de la famille de matières.
-- ---------------------------------------------------------------------------
grant select on pays, referentiels, niveaux, series, matieres, unites, unites_series, chapitres, prerequis_chapitres
  to anon, authenticated, agent_professeur;

create policy catalogue_lecture on pays for select to anon, authenticated, agent_professeur using (true);
create policy catalogue_lecture on referentiels for select to anon, authenticated, agent_professeur using (true);
create policy catalogue_lecture on niveaux for select to anon, authenticated, agent_professeur using (true);
create policy catalogue_lecture on series for select to anon, authenticated, agent_professeur using (true);
create policy catalogue_lecture on matieres for select to anon, authenticated, agent_professeur using (true);
create policy catalogue_lecture on unites for select to anon, authenticated, agent_professeur using (true);
create policy catalogue_lecture on unites_series for select to anon, authenticated, agent_professeur using (true);

create policy chapitres_lecture_public on chapitres for select to anon, authenticated
  using (statut = 'valide' or est_referent_du_chapitre(id));
create policy chapitres_lecture_agent on chapitres for select to agent_professeur
  using (chapitre_accessible_agent(id));

create policy prerequis_lecture_public on prerequis_chapitres for select to anon, authenticated
  using (statut = 'valide' or est_referent_du_chapitre(chapitre_id));
create policy prerequis_lecture_agent on prerequis_chapitres for select to agent_professeur
  using (statut = 'valide' and chapitre_accessible_agent(chapitre_id));

-- ---------------------------------------------------------------------------
-- Données personnelles : chacun ne lit que les siennes. Aucune écriture directe.
-- ---------------------------------------------------------------------------
grant select on profils, eleves, consentements, referents_familles, progression to authenticated;

create policy profil_personnel on profils for select to authenticated using (id = auth.uid());
create policy eleve_personnel on eleves for select to authenticated using (id = auth.uid());
create policy consentements_personnels on consentements for select to authenticated using (eleve_id = auth.uid());
create policy familles_personnelles on referents_familles for select to authenticated using (referent_id = auth.uid());
create policy progression_personnelle on progression for select to authenticated using (eleve_id = auth.uid());

-- L'agent Professeur lit et écrit la progression de l'élève connecté, sur les chapitres validés de son unité.
grant select, insert on progression to agent_professeur;
grant update (statut, score, maj_le) on progression to agent_professeur;

create policy progression_agent_lecture on progression for select to agent_professeur
  using (eleve_id = contexte_agent('eleve_id'));
create policy progression_agent_insertion on progression for insert to agent_professeur
  with check (eleve_id = contexte_agent('eleve_id') and chapitre_accessible_agent(chapitre_id));
create policy progression_agent_maj on progression for update to agent_professeur
  using (eleve_id = contexte_agent('eleve_id'))
  with check (eleve_id = contexte_agent('eleve_id') and chapitre_accessible_agent(chapitre_id));

-- ---------------------------------------------------------------------------
-- Validation : lecture des approbations par les référents ; écriture uniquement par valider_chapitre().
-- ---------------------------------------------------------------------------
grant select on approbations to authenticated;
create policy approbations_referents on approbations for select to authenticated using (est_referent());

-- ---------------------------------------------------------------------------
-- Signalements : créés par l'élève (sur lui-même) ou par l'agent Professeur (pour l'élève connecté),
-- lus par les référents de la famille concernée et les administrateurs.
-- ---------------------------------------------------------------------------
grant select, insert on signalements to authenticated;
grant insert on signalements to agent_professeur;

create policy signalements_eleve on signalements for insert to authenticated
  with check (source = 'eleve' and eleve_id = auth.uid() and traite_le is null);
create policy signalements_agent on signalements for insert to agent_professeur
  with check (
    source = 'agent_professeur' and traite_le is null
    and (eleve_id is null or eleve_id = contexte_agent('eleve_id'))
  );
create policy signalements_lecture on signalements for select to authenticated
  using (role_courant() = 'administrateur' or (chapitre_id is not null and est_referent_du_chapitre(chapitre_id)));

-- ---------------------------------------------------------------------------
-- Fonctions autorisées.
-- ---------------------------------------------------------------------------
grant execute on function role_courant(), est_referent(), est_referent_du_chapitre(uuid)
  to anon, authenticated;
grant execute on function empreinte_chapitre(text, text[]) to authenticated;
grant execute on function contexte_agent(text), chapitre_accessible_agent(uuid) to agent_professeur;
grant execute on function valider_chapitre(uuid, decision_validation, integer, text) to authenticated;
grant execute on function inscrire_eleve(text, text, text, text, boolean, text, text) to authenticated;
grant execute on function confirmer_consentement_parent(text) to anon, authenticated;
