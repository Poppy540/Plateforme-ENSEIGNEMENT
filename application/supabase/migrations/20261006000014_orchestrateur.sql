-- Jalon 3, étape 2 : Orchestrateur programmé (ADR 0029).
-- Ses alertes rejoignent la file humaine (signalements) ; seule l'administration réactive un agent suspendu.

grant insert on signalements to agent_orchestrateur;
create policy signalements_orchestrateur_insertion on signalements for insert to agent_orchestrateur
  with check (source = 'agent_orchestrateur' and traite_le is null and eleve_id is null);

grant update (suspendu, motif) on etat_agents to authenticated;
create policy etat_agents_reactivation on etat_agents for update to authenticated
  using (role_courant() = 'administrateur') with check (role_courant() = 'administrateur');

-- Journal d'audit : écrit aussi pour les décisions humaines prises dans l'administration.
grant insert (acteur, acteur_empreinte, action, objet_type, objet_id, details) on journal_audit to authenticated;
create policy audit_administration_insertion on journal_audit for insert to authenticated
  with check (role_courant() = 'administrateur');
