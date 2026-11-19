# 0037 — Famille Mathématiques au collège et graphe de prérequis validé lien par lien

- **Date** : 2026-10-15 · **Statut** : technique, conforme à l'ADR 0035 (point 2) · données **provisoires**
- **Migration** : 0020 · **Tests** : G01-G03 (base), lecture du pack (unitaires), bout en bout (`famille-maths.spec.ts`)

## Décision

1. **Programmes de 6e, 5e et 4e** dans le pack (`referentiels/gabon/programmes/`) : intitulés repris **mot pour mot** du cadrage, statut « à valider », volumes et coefficients manquants. Avec la 3e, la famille Mathématiques compte quatre unités.
2. **Graphe de prérequis dans le pack** (`prerequis/<famille>.yaml`) : liens chapitre ← prérequis, `strict` (indispensable) ou `souple` (utile). La lecture du pack refuse :
   - un chapitre inconnu ;
   - un prérequis d'une classe **supérieure** ;
   - un doublon, une boucle ou un cycle.
   Le graphe du Gabon (44 liens) est une **proposition de Claude Code**.
3. **Import** : un lien nouveau entre « à valider » ; un lien existant n'est jamais modifié par un nouvel import, ce qui préserve la décision du référent.
4. **Validation lien par lien** (`decider_prerequis`) :
   - seul un référent de la famille **des deux chapitres** décide ; le rejet exige une remarque ; la décision est tracée (auteur, date) ;
   - personne n'écrit directement dans la table ;
   - côté référent : section « Prérequis » sur la page de chaque chapitre, nombre de liens en attente sur le tableau de bord, page `/referent/prerequis`.
5. **Seuls les liens validés servent aux agents** (Tuteur, Scénariste, Évaluateur). Le Tuteur remonte ainsi d'un chapitre de 3e à une notion de 4e.
6. **Valeurs des agents** pour la 6e, la 5e et la 4e : celles de l'unité pilote, adaptées au niveau d'après `profils-niveau.yaml`. L'examen reste « le BEPC, en fin de 3e ».
7. **Catalogue** : un élève voit dans son catalogue les unités de **sa** classe. Il peut ouvrir un chapitre validé d'une classe inférieure, par exemple depuis son plan de révision.

## Limites

- Tout est à valider : programmes (programmes officiels de l'IPN), liens, valeurs des agents. Le Coordinateur de famille (étape 2) proposera ensuite des corrections du graphe au statut « brouillon ».
- Un lien validé reste valable si l'un de ses chapitres est modifié puis revalidé. La cohérence de la famille sera contrôlée par le Coordinateur.
