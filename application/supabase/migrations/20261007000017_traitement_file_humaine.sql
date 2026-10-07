-- Jalon 3, étape 6 : l'administration traite la file humaine (ADR 0033).
-- Un signalement est marqué traité ; un ticket passe « en cours » puis « résolu ». Le traitant est la personne
-- connectée (jamais une autre), et un élément traité ne peut pas être rouvert ni réattribué.

grant update (traite_le, traite_par) on signalements to authenticated;
create policy signalements_traitement on signalements for update to authenticated
  using (role_courant() = 'administrateur' and traite_le is null)
  with check (role_courant() = 'administrateur' and traite_le is not null and traite_par = auth.uid());

grant update (statut, traite_le, traite_par) on tickets_support to authenticated;
create policy tickets_traitement on tickets_support for update to authenticated
  using (role_courant() = 'administrateur' and statut <> 'resolu')
  with check (
    role_courant() = 'administrateur' and traite_par = auth.uid()
    and (statut = 'en_cours' or (statut = 'resolu' and traite_le is not null))
  );
