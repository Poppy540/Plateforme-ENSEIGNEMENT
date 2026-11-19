# 0065 — Plan du Jalon 10 : outiller le propriétaire

- **Date** : 2026-10-27 · **Statut** : validé par le propriétaire

## Contexte

Inviter un référent ou créer une classe demande aujourd'hui une commande (`pnpm referent:invitation`, `pnpm classe:creer`) et l'application d'un fichier SQL sur la base de production. Pour le propriétaire, c'est une source d'erreurs, et un accès à la base qu'il vaut mieux réserver aux migrations. Par ailleurs, aucune skill propre au projet n'encadre encore le contact des agents avec des mineurs (question ouverte n° 4 de `memory.md`).

## Décision

Plan `docs/plans/jalon-10.md` :
- invitations de référents, puis classes, créées depuis `/administration`, avec les codes affichés une seule fois ;
- skill commune « élèves mineurs », ajoutée aux quatre agents qui parlent aux élèves ou à leurs parents ;
- passages réels dès la clé ; démonstration et bilan.

Aucune nouvelle matière ; aucun prompt modifié.

## Conséquences

- L'administration pourra créer des accès : ses formulaires sont réservés au rôle administrateur, vérifiés en base, et tracés dans le journal d'audit.
- Une skill change la conduite des agents sans changer leur prompt. Elle est marquée « à valider » jusqu'à la relecture du propriétaire, avant tout passage réel.
- Rien n'est déployé ni souscrit.
