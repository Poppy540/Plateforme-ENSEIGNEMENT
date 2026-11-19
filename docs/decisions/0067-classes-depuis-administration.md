# 0067 — Classes du pilote depuis l'administration

- **Date** : 2026-10-28 · **Statut** : appliqué (Jalon 10, étape 2). Aucune vraie classe avant l'avis du juriste (Q19).

## Contexte

Jusqu'ici, une classe du pilote (ADR 0063) se créait avec `pnpm classe:creer` et un fichier SQL appliqué à la base. Les codes perdus ou divulgués ne pouvaient pas être remplacés sans SQL. Comme pour les référents (ADR 0066), le propriétaire doit pouvoir tout faire depuis l'administration (ADR 0065).

## Décision

1. **Page `/administration/classes`**, réservée au rôle administrateur.
   - **Création** : un formulaire par référentiel (niveau, série facultative, nom, établissement, durées des deux codes). Les deux codes (classe, enseignant) s'affichent **une seule fois**, dans la réponse du formulaire.
   - **Liste** sans les codes : élèves rattachés, validité du code de classe, enseignants actifs (prénoms), invitation en attente.
   - **Actions** :
     - nouveau code de classe : l'ancien cesse aussitôt de marcher, les élèves déjà rattachés le restent ;
     - nouvelle invitation d'enseignant ;
     - annulation des invitations en attente.
   - Un rappel en haut de page : aucune vraie classe avant l'avis du juriste.
2. **Fonctions en base** (migration 0037), qui vérifient toutes le rôle administrateur :
   - `options_classe`, `creer_classe` (référentiel, niveau, série, longueurs, empreintes de 64 caractères hexadécimaux, durées), `classes_admin` ;
   - `nouveau_code_classe`, `nouvelle_invitation_enseignant`, `annuler_invitations_enseignant`.

   Les invitations d'enseignant gagnent une date de création et d'annulation. Une invitation annulée expire aussitôt : `activer_enseignant` la refuse sans changement.
3. **Journal d'audit** : création, nouveau code, invitation et annulation, avec l'empreinte de l'administrateur. **Jamais les codes.**
4. La commande `pnpm classe:creer` reste, en secours.

## Conséquences

- Le propriétaire n'a plus besoin d'accéder à la base pour gérer les classes.
- Le nombre d'élèves rattachés est affiché en clair à l'administration, qui voit déjà les comptes. L'enseignant, lui, ne voit toujours rien sous 5 élèves.
- Tests : base H01 à H03 ; bout en bout `classes-administration.spec.ts` (création, codes affichés une seule fois, activation de l'enseignant, élève rattaché, nouveau code avec l'ancien refusé, nouvelle invitation puis annulation, audit d'accessibilité).
- Test rendu robuste en passant : `catalogue.spec.ts` allait sur `/catalogue` sans attendre la fin de l'inscription.
