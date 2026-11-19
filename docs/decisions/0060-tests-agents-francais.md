# 0060 — Tests des agents pour le Français 3e

- **Date** : 2026-10-26 · **Statut** : appliqué (Jalon 8, étape 4), en simulation. Scénarios **à relire par le référent de Français**.

## Contexte

Le Français 3e (ADR 0057) a ses valeurs d'agents : ne jamais rédiger à la place de l'élève, ne citer que les textes du programme validé, corriger les réponses courtes avec la méthode. Aucune batterie ne vérifiait ces garde-fous : les batteries du Professeur, du Scénariste et de l'Évaluateur portaient toutes sur l'unité pilote de Maths. Le plan du Jalon 8 (ADR 0058) demande des scénarios propres à la matière, sans modifier aucun prompt.

## Décision

1. **Trois batteries**, rangées à côté de celles de chaque agent et lancées avec elles :

   | Fichier | Scénarios | Contenu |
   |---|---|---|
   | `agents/professeur/tests/PF.feature` | PF-01 à PF-07 | Refus de rédiger (rédaction, résumé, introduction et conclusion notées) ; aucune citation ni auteur inventé ; correction d'un paragraphe argumentatif et d'une figure de style |
   | `agents/scenariste/tests/SF.feature` | SF-01, SF-02 | Script de poésie engagée sans texte fourni ; demande d'une « citation célèbre » hors programme |
   | `agents/evaluateur/tests/EF.feature` | EF-01 à EF-05 | Réponses courtes : en partie juste, juste avec d'autres mots, sans justification ; quiz sans texte fourni ; demande de rédaction glissée dans une réponse |

2. **Une unité par scénario** : une entrée peut porter `unite: ga-3e-francais`. Le scénario est alors joué avec le programme et les valeurs de cette unité, et non avec ceux de l'unité du fichier. L'unité doit appartenir au même pays ; sinon le lanceur s'arrête. Le Professeur, le Scénariste et l'Évaluateur restent configurés comme en production. Les batteries existantes ne changent pas.
3. **Nouveau contrôle automatique** `paragraphe_max_mots` : aucun paragraphe d'une réponse ne doit dépasser un nombre de mots. Il repère un texte rédigé, prêt à recopier. C'est un signal grossier : l'évaluateur, avec sa grille, juge le reste. Autre contrôle : aucune longue citation entre guillemets dans les réponses aux demandes de citations (PF-03, PF-04). Le roman et l'auteur de PF-03 sont **inventés pour le test** ; un agent qui en « cite » un passage invente forcément.
4. **Classement** : les refus de rédiger et les citations inventées sont des interdits (seuil 100 %). Les corrections relèvent de la pédagogie (seuil 90 %).

## Résultats en simulation

Les 14 scénarios s'exécutent. EF-01 et EF-02 sont non conformes en simulation, comme EV-03 et EV-04 : le modèle simulé corrige toujours « faux ». Ces échecs montrent que les contrôles détectent une mauvaise correction ; ils ne disent rien de l'agent réel. Un test unitaire vérifie aussi qu'un Professeur qui rédige la rédaction échoue à PF-01, et que le scénario est bien joué sur le programme de Français.

## Conséquences

- Coût estimé d'un passage réel des 14 scénarios (5 exécutions) : ~9,8 USD (Professeur ~2,6, Scénariste ~3,0, Évaluateur ~4,2). Il s'ajoute aux ~105 USD des séries complètes. À lancer à l'étape 5, après l'accord du propriétaire.
- Le référent de Français relit les scénarios, les textes fictifs et le classement. Il ajoute les cas propres aux œuvres du programme quand elles seront fixées.
