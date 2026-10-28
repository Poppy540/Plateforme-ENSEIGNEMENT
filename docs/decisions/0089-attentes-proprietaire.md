# 0089 — Ce qui attend le propriétaire

- **Date** : 2026-10-28 · **Statut** : appliqué (Jalon 15, étape 2).

## Contexte

Chaque bilan, du Jalon 6 au Jalon 14, se termine par « Décisions et actions attendues du propriétaire ». Les points s'y accumulent : « les attentes des bilans précédents restent ouvertes », puis une liste qui s'allonge. Plusieurs points sont pourtant visibles dans la plateforme, comme une condition cochée, un chapitre du pilote désigné ou une skill encore « à valider ».

## Décision

1. **Une liste unique de 22 points** (`src/lib/pilote/attentes.ts`), rangée en 7 thèmes : juriste ; cadre du pilote ; référents et contenus ; agents ; hébergement et déploiement ; pendant et après le pilote ; facultatif. Chaque point dit où agir et ce qu'il débloque.
2. **État calculé quand la plateforme le voit** :
   - conditions du pilote (ADR 0078) : juriste, établissement, référents, contenus, valeurs du pack, clé et essais, hébergement, messages, veille, répétition ;
   - période saisie, chapitres du pilote, classe créée ;
   - questionnaire du pack au statut « valide » ;
   - seuils complets (aucun critère « non surveillé ») et condition 11 remplie ;
   - skills du projet dont le fichier porte encore « À valider par le propriétaire ».

   Les autres points sont « à confirmer par vous » : GitHub Actions, suivi chaque semaine, fin du pilote, avatar, surveillance, lecteur d'écran.

3. **Page `/administration/attentes`** (« Ce qui vous attend ») : décompte (à faire, à confirmer, faits) et liste par thème. Le tableau de bord du pilote (ADR 0088) affiche le décompte dans un encadré, avec un lien vers la liste.
4. **Document `docs/attentes-proprietaire.md`** : la même liste, avec des cases à cocher pour les points que seul le propriétaire voit. Un test unitaire vérifie que le document et le code contiennent exactement les mêmes points (marqueurs `<!-- attente:code -->`).
5. **Les bilans suivants renvoient à ce document** au lieu de répéter leurs listes. Un nouveau besoin du propriétaire s'ajoute à la liste du code et au document en même temps, sinon le test échoue.

## Tests

- Unitaires : codes uniques, sans pays en dur ; état de départ ; tout fait côté plateforme ; règles composées (seuils et condition 11, veille 8 et 9, questionnaire inconnu) ; concordance avec le document.
- Bout en bout : encadré du tableau de bord, liste par thème, skills « à faire » (le dépôt les marque encore « à valider »), GitHub « à confirmer », accessibilité.
