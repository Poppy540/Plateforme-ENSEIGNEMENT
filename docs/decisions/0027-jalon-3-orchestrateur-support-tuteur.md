# 0027 — Jalon 3 : Orchestrateur programmé, Support sur le site, rapports hebdomadaires, rappels désactivés

- **Date** : 2026-10-06 · **Statut** : validé par le propriétaire

## Décisions

1. **Orchestrateur = chaîne programmée** (comme la production vidéo, ADR 0020) : routage par règles, vérification des approbations **dans la base** avant toute étape qui suit une validation humaine, priorités (détresse d'abord), limites d'échanges et de coût, suspension d'une tâche ou d'un agent avec alerte, journal d'audit pseudonymisé. Un modèle de langage ne sert, au plus, qu'à classer une demande libre ambiguë ; il ne décide jamais d'une validation. Le prompt C de l'Orchestrateur reste la référence des règles ; la batterie OR s'applique au code (tests déterministes).
2. **Support/inscription sur le site d'abord** ; WhatsApp Business plus tard (fournisseur, coûts, modèles de messages approuvés).
3. **Rapports du Tuteur aux parents : hebdomadaires et à la demande du parent**, uniquement avec le consentement « rapports aux parents » enregistré (distinct de celui de l'inscription, révocable), par le canal du contact parent déjà enregistré, avec un modèle de message approuvé.
4. **Rappels de travail à l'élève désactivés par défaut** ; l'élève peut les activer et en choisir la fréquence.
