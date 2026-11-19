# 0061 — Plan du Jalon 9 : prêt pour la première classe

- **Date** : 2026-10-26 · **Statut** : validé par le propriétaire

## Contexte

Le Jalon 8 a préparé les démarches du propriétaire (juriste, mise en route) et mesuré la tenue en charge. Le pilote attend toujours des personnes extérieures. Trois manques touchent directement la première classe :
- l'enseignant de la classe pilote n'a aucun moyen de suivre sa classe ;
- le texte libre des élèves part au Professeur sans masquage (question Q8 du dossier du juriste) ;
- une instance du serveur plafonne à environ 100 pages par seconde.

## Décision

Plan `docs/plans/jalon-9.md` :
- masquage du texte des élèves avant le Professeur ;
- vue de l'enseignant de la classe, en chiffres agrégés seulement (masqués sous 5 élèves) ;
- pages plus légères, mesurées avec `pnpm charge` ;
- passages réels dès la clé ; démonstration et bilan.

Aucune nouvelle matière ; aucun prompt modifié. Le masquage et l'absence de contenu nouveau sont des choix par défaut de Claude Code, le propriétaire n'ayant pas exprimé de préférence.

## Conséquences

- Un nouveau public (enseignant de la classe) et un rattachement des élèves à une classe : un nouveau traitement de données, à ajouter au registre du dossier du juriste et à la fiche d'information des familles.
- Aucune donnée individuelle n'est montrée à l'enseignant avant l'avis du juriste.
- Rien n'est déployé ni souscrit.
