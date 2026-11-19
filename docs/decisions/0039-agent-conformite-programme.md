# 0039 — Agent Conformité programme : documents officiels, rapports d'écart, brouillon de programme

- **Date** : 2026-10-17 · **Statut** : technique, conforme au prompt de la Conformité, au §5.2 et à l'ADR 0035 · construit sans clé API (modèle simulé)
- **Migration** : 0022 · **Tests** : Z01-Z03 (base), unitaires, lanceur (16 scénarios TC + CO, TC-09 non applicable), bout en bout (`conformite.spec.ts`)

## Décision

1. **Dépôt d'un document** (texte collé ou PDF de 10 Mo au plus) par un référent du référentiel ou par l'administration.
   - Chaque dépôt enregistre une origine déclarée, une case « document officiel » cochée par la personne qui dépose, et une empreinte calculée par la base.
   - Le dépôt passe par une route dédiée (`/api/conformite/documents`) : la limite des actions serveur (1 Mo) n'est pas relevée pour tout le site. Contrôles : même origine, taille, signature `%PDF-`.
   - Le PDF n'est jamais relu par les utilisateurs ; seul l'agent le reçoit.
2. **Analyse** d'un document pour une unité de la famille du référent, avec une consigne facultative traitée comme une donnée.
   - Elle passe par l'**Orchestrateur** (type `comparaison_programme`).
   - Le PDF est joint au modèle comme bloc « document » (sans citations, incompatibles avec la sortie imposée ; la page est demandée dans le schéma). Le texte est isolé comme donnée non fiable.
3. **Rôle `agent_conformite`** : il lit le référentiel du pays, **son seul document** et les scripts et quiz validés de l'unité comparée ; il n'écrit que des rapports au statut brouillon et des signalements sans élève. Aucune donnée d'élève, aucune écriture dans le référentiel.
4. **Sortie imposée par schéma** :
   - document (officiel ou non, version du programme) ;
   - extraction : source, statut officielle / déduite / manquante, champs manquants, confiance ;
   - comparaison : réutilisable / à adapter / à recréer, présence de chaque côté ;
   - alertes, points à valider, synthèse.
   « Conforme » n'existe pas dans le schéma.
5. **Contrôles du serveur** :
   - pas de donnée « officielle » sans source, ni si le document n'a pas été déclaré officiel au dépôt ;
   - pas de valeur pour un champ déclaré manquant ;
   - références de chapitres existantes ;
   - synthèse de cinq lignes au plus.
   Chaque correction est conservée avec le rapport. Les alertes qui demandent un humain (sources contradictoires, version incertaine, document illisible, écart majeur, instruction cachée) rejoignent la file humaine.
6. **Brouillon de programme** : depuis un rapport, le référent télécharge un YAML au format du pack (statut « à valider », sources en commentaire). Il le relit et le range dans le pack (dépôt git) ; l'import le charge « à valider ». L'agent ne touche jamais au référentiel.

## Limites

- En simulation, le PDF n'est pas lu (alerte « document illisible ») ; seul un passage réel extrait un PDF.
- Les transcriptions de vidéos ne sont pas encore comparées.
- L'administration peut déposer en base mais n'a pas encore d'écran ; le dépôt se fait depuis l'espace référent.
