-- Rôle « enseignant » de la classe pilote (Jalon 9, étape 2 ; ADR 0063). Seul dans sa migration : une valeur ajoutée
-- à un type énuméré ne peut pas servir dans la transaction qui l'ajoute.
alter type role_compte add value if not exists 'enseignant';
