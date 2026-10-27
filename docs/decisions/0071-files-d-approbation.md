# 0071 — Files d'approbation du référent : le pilote en tête

- **Date** : 2026-10-28 · **Statut** : appliqué (Jalon 11, étape 2). **Skill à valider par le propriétaire avant tout passage réel.**

## Contexte

Le plan du Jalon 11 (ADR 0069) prévoyait une skill « files d'approbation » pour l'Orchestrateur et le Coordinateur. Or l'Orchestrateur n'est pas un modèle de langage : c'est une chaîne de règles programmées (ADR 0029). Une skill ne peut donc pas s'appliquer à lui. La même priorité est traduite en **règles programmées** pour les files du référent, et en **skill** pour le Coordinateur, qui est un modèle.

## Décision

1. **Règles programmées** (migration 0039) : `est_chapitre_pilote(uuid)` dit seulement si un chapitre est au pilote. Dans chaque file de l'espace référent, les chapitres du pilote passent en tête et portent la mention « pilote » :
   - chapitres à valider ;
   - liens de prérequis, si l'un des deux chapitres est au pilote ;
   - scripts, quiz et vidéos à relire.

   Ce qui est signalé passe encore avant, pilote ou non : un script marqué « à relire en priorité », un quiz avec des questions signalées.
2. **Skill** `agents/coordinateur/skills/files-d-approbation` (écrite pour le projet, chargée par toutes les familles). L'ordre de priorité est :
   - les alertes ;
   - puis ce qui bloque un chapitre du pilote, dans l'ordre du guide du référent, y compris ses prérequis stricts ;
   - puis le reste.

   Elle s'applique au plan de production et à la synthèse au référent (3 décisions au plus). Il est interdit au Coordinateur de valider, de changer la liste du pilote ou de faire passer le pilote avant une alerte.
3. **Données du Coordinateur** : les chapitres du pilote sont marqués `[pilote]`. L'ordre compatible avec les prérequis, calculé par le serveur et donné au Coordinateur, commence désormais par les chapitres du pilote, chacun précédé de ses prérequis (`ordreCompatible`). Le rôle `agent_coordinateur` lit `chapitres_pilote`, une table sans donnée d'élève.
4. **Tests** :
   - batterie `agents/coordinateur/tests/FA.feature` :
     - FA-01 (pédagogie) : le plan s'ouvre par le pilote ou ses prérequis ; nouveau contrôle `pilote_en_tete` ;
     - FA-02 (interdit) : refus de valider d'office ou de changer le pilote ;
   - base CP04 ; tests unitaires de l'ordre ;
   - le modèle simulé refuse aussi « d'office » et « au pilote ».

## Conséquences

- Coût estimé des séries complètes réelles : ~121 USD (Coordinateur ~24,3 USD, dont ~1,8 pour FA).
- La skill est notée « à valider » dans `agents/coordinateur/skills/SOURCES.md`.
- Défaut trouvé par les tests de bout en bout et corrigé avant la livraison : un `order by` utilisait un alias de colonne dans une expression, ce que Postgres refuse.
