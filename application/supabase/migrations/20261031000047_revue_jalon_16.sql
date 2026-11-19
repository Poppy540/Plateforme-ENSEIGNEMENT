-- Revue de sécurité du Jalon 16 (ADR 0092), S6 : une fonction de déclencheur gardait le droit d'exécution par
-- défaut pour public. Sans effet (une fonction de déclencheur ne s'appelle pas directement), mais c'était
-- l'exception à la règle « aucune fonction privilégiée ouverte à public », que vérifient désormais les tests.
revoke execute on function videos_avant_insertion() from public;

-- S1 : limite d'essais sur la saisie des codes de classe et d'invitation (10 par compte et par jour, fixée par le
-- serveur) ; la clé est une empreinte salée du compte, jamais le code saisi.
alter table limites_connexion drop constraint limites_connexion_nature_check;
alter table limites_connexion add constraint limites_connexion_nature_check
  check (nature in ('envoi', 'envoi_global', 'verification', 'code_classe', 'code_invitation'));
