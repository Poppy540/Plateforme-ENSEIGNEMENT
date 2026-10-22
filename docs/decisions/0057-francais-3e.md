# 0057 — Français 3e, première matière littéraire

- **Date** : 2026-10-22 · **Statut** : appliqué (Jalon 7, étape 4). Contenus **provisoires**, à valider par un référent de Français.

## Contexte

Le plan du Jalon 7 (ADR 0053) ajoute une première matière littéraire, en classe de BEPC. Le Coordinateur de la famille Français et sa skill (`coordination-francais`) existaient déjà, mais aucun contenu.

## Décision

1. **Programme** `ga-3e-francais` : 6 chapitres, intitulés repris mot pour mot du cadrage, avec le statut « à valider ». Les œuvres et auteurs au programme, dont les auteurs gabonais et africains, sont à fixer avec le référent ; rien n'est inventé.
2. **Graphe** `prerequis/francais.yaml` : 6 liens, tous en 3e (les programmes de 6e à 4e ne sont pas dans le pack) :
   - l'autobiographie s'appuie sur la nouvelle (outils du récit) ;
   - la préparation du BEPC s'appuie sur les autres chapitres.
3. **Valeurs des agents** (Professeur, Scénariste, Évaluateur, avatar synthétique), avec la méthode et les garde-fous de la famille Français :
   - expliquer la règle et faire réécrire ;
   - donner un plan avant de rédiger ;
   - **ne jamais écrire un résumé, une rédaction ou une réponse notée à la place de l'élève**, ni un texte « modèle » à recopier ;
   - ne citer que les textes du programme validé, sans inventer d'auteur ni de citation.
   - Pour l'Évaluateur : les réponses courtes (repérage, procédé, justification) sont corrigées avec la méthode ; une rédaction longue relève de l'enseignant.
4. Le Coordinateur Français ne voit que sa famille (test de base K01 adapté : il voit maintenant des chapitres, tous de Français).

## Conséquences

- La mécanique est vérifiée en simulation de bout en bout : validation par un référent de Français, quiz avec réponse courte corrigée, revue de cohérence du Coordinateur Français. La qualité réelle des contenus de Français ne pourra être jugée qu'avec les passages réels et la relecture du référent.
- Les batteries de tests des agents restent écrites pour Maths 3e. Une batterie propre au Français (rédaction refusée, citations inventées) est à prévoir avec le référent.
- À fournir par le propriétaire : un référent de Français et les programmes IPN.
