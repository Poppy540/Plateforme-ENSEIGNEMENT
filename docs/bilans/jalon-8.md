# Bilan du Jalon 8

**Date** : 2026-10-26 · **Branche** : `claude/gabon-education-platform-ldrr4p` · **Données** : fictives uniquement ; agents, messagerie et vidéo **simulés** (aucune clé API, aucun fournisseur branché) ; rien n'est déployé ni souscrit ; **aucun élève réel**.

## 1. Objectif et résultat

Objectif (plan validé, ADR 0058) : ce qui retarde le pilote ne dépend plus du code. Le jalon prépare donc vos démarches (juriste, mise en route), vérifie la tenue à 200 élèves simultanés et ajoute les tests des agents propres au Français.

| Étape du plan | État | Remarque |
|---|---|---|
| 1. Dossier pour le juriste | **Fait, à relire par vous** | [`docs/juridique/dossier-juriste.md`](../juridique/dossier-juriste.md) : registre des traitements (T1 à T10), sous-traitants et transferts, droits, sécurité, 10 risques pour les mineurs, 18 questions. Version en ligne privée, à partager depuis sa page. |
| 2. Guide de mise en route | **Fait** | [`docs/mise-en-route.md`](../mise-en-route.md) : de zéro au pilote en étapes A à H, avec qui contacter, commandes, durées indicatives, blocages. |
| 3. Tenue en charge | **Fait** | 200 élèves fictifs simultanés : 0 erreur ; 95 % des réponses en moins de 59 ms au rythme d'une classe (ADR 0059). |
| 4. Tests des agents pour le Français | **Fait, en simulation** | 14 scénarios (Professeur, Scénariste, Évaluateur) : refus de rédiger, aucune citation inventée, corrections avec la méthode (ADR 0060). |
| 5. Passages réels des agents | **En attente** | Clé API et accord sur le coût. |
| 6. Bilan | **Fait** | Ce document. Aucune capture : aucun écran n'a changé dans ce jalon. |

**Le Jalon 8 sera clos** quand les passages réels des batteries auront atteint les seuils (étape 5).

## 2. Ce que le jalon a appris

- **Tenue en charge** (une instance, poste à 4 cœurs, agents simulés) :

  | Rythme de chaque élève | Médiane | 95 % des réponses en moins de | Erreurs |
  |---|---|---|---|
  | une page toutes les ~5 s (rythme d'une classe) | 25 ms | 59 ms | 0 |
  | une page par seconde | 0,98 s | 1,8 s | 0 |
  | sans aucune pause (saturation) | 2,2 s | 3,1 s | 0 |

  - Le goulot est le processeur du serveur web (environ 100 pages par seconde par instance), pas la base.
  - En production, il faudra plusieurs instances dès que le pilote dépasse quelques classes.
  - Réglage ajouté : `TAILLE_POOL_BASE` (connexions à la base par instance, 10 par défaut). Une page qui n'obtient pas de connexion en 10 s renvoie une erreur au lieu de rester bloquée.
- **Écart relevé pour le juriste (question Q8)** : le texte libre des élèves n'est pas masqué avant l'envoi au Professeur, alors qu'il l'est pour le Support et le Recruteur. Je peux le corriger quand vous le souhaitez, sans toucher au prompt.
- **Non mesuré encore** : la lenteur d'un vrai modèle et les limites de débit du compte Anthropic (étape 5), le réseau des élèves, le débit du fournisseur de SMS.

## 3. Ce que vérifient les tests

| Série | Nombre | Commande |
|---|---|---|
| Tests unitaires (dont lanceur des tests d'agents et batteries du Français) | 241, tous passés | `pnpm test` |
| Base de données | 111 scénarios, tous passés | `pnpm test:base` |
| Bout en bout sur téléphone simulé | 87, tous passés | `pnpm test:e2e` |
| Tenue en charge | 200 élèves, seuils tenus | `pnpm charge` (base locale seulement) |
| Agents, mécanique sans coût | Conformes sauf les non conformes connus de la simulation : Professeur TC-02, TC-09, TC-10, PR-03, PR-06 ; Évaluateur EV-02 à EV-04, EF-01, EF-02 ; Coordinateur CM-02, CM-12, CM-16. Le modèle simulé est naïf ; ces échecs montrent que les contrôles détectent les mauvaises réponses. | `pnpm test:agents [--agent …]` |

## 4. Coûts

| Poste | Estimation | Statut |
|---|---|---|
| Passages réels complets de toutes les batteries (5 exécutions par scénario) | ~115 USD : Professeur ~11,9 ; Scénariste ~28,2 ; Évaluateur ~19,3 ; Tuteur ~7,7 ; Support ~4,3 ; Coordinateur ~22,5 ; Conformité ~12,5 ; Recruteur ~8,9. Dont ~9,8 USD pour le Français. | Non lancés : clé et accord attendus |
| Mini-essais (1 exécution de quelques scénarios par agent) | Quelques USD | Non lancés |
| Dépenses du jalon | 0 USD ; aucune dépendance ajoutée | — |

## 5. Décisions et actions attendues du propriétaire

Le [guide de mise en route](../mise-en-route.md) les met dans l'ordre. Les plus urgentes :

1. **Relire le dossier pour le juriste**, corriger ce qui vous concerne (rôle, structure, référence de la loi), puis le transmettre. **Chercher un juriste** dès maintenant : c'est la démarche la plus longue.
2. **Clé API** et **accord sur le coût** : mini-essais d'abord, puis séries complètes (~115 USD).
3. **Référents** : Maths 3e d'abord, puis Sciences et Français. Le référent de Français relira aussi les scénarios PF, SF et EF.
4. **Cadre du pilote** : classe, matières, dates.
5. Toujours ouvertes depuis les jalons précédents :
   - validation du questionnaire et des valeurs provisoires des agents ;
   - `SEL_OPPOSITION` ;
   - fournisseurs (hébergement, Supabase, SMS, email, avatar) ;
   - service de surveillance, facultatif.
6. **Facultatif** : masquer le texte des élèves avant l'envoi au Professeur (question Q8 du juriste).
