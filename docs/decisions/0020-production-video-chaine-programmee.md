# 0020 — Production vidéo : chaîne programmée

- **Date** : 2026-10-04 · **Statut** : validée par le propriétaire
- **Décision** : la production vidéo est une **chaîne programmée** (code déterministe), pas un agent conversationnel. Elle applique toutes les règles du prompt C2 (`agents/production-video/prompt.md`) : script validé uniquement, statut + version + empreinte vérifiés, texte jamais modifié, sous-titres tirés du texte validé, contrôles de durée et de fidélité, version faible débit, dépôt au statut « à relire », coût consigné, budget bloquant, 3 tentatives au plus par segment, aucune voix ni aucun visage réel sans autorisation enregistrée.
- Un modèle de langage n'intervient, au plus, que pour rédiger le rapport d'anomalies.
- La batterie VP s'applique à la chaîne (tests automatiques déterministes).
- Le prompt C2 reste inchangé et sert de référence des règles.
