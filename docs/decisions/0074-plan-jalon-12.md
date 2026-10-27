# 0074 — Plan du Jalon 12 : prêt à déployer

- **Date** : 2026-10-28 · **Statut** : validé par le propriétaire

## Contexte

Tout est construit et essayé en simulation. Le premier déploiement reste pourtant une suite de gestes manuels :
- migrations appliquées fichier par fichier ;
- aucun paquet de déploiement défini ;
- aucune répétition générale de bout en bout.

De plus, les 12 conditions du pilote ne sont suivies que dans un document : rien ne relie la décision de démarrer à l'état réel de la plateforme.

## Décision

Plan `docs/plans/jalon-12.md` :
- migrations suivies en base (`pnpm base:migrer`) ;
- paquet de déploiement autonome, sans secret ;
- répétition générale en local, simulation coupée ;
- tableau des 12 conditions dans l'administration, vérifiées automatiquement quand c'est possible, sinon cochées avec une preuve ;
- passages réels dès la clé ; démonstration et bilan.

Écartés pour ce jalon : la skill « faible débit » et une nouvelle matière.

## Conséquences

- Rien n'est déployé ni souscrit : le paquet et la répétition sont essayés en local.
- Une nouvelle table de suivi des migrations est créée en base. Les bases existantes (locale, de test) sont reconnues comme « à jour » à leur premier passage, après une vérification explicite.
- Les preuves cochées par le propriétaire sont tracées dans le journal d'audit.
