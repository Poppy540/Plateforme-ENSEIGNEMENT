# Bilan du Jalon 9

**Date** : 2026-10-27 · **Branche** : `claude/gabon-education-platform-ldrr4p` · **Données** : fictives uniquement ; agents, messagerie et vidéo **simulés** (aucune clé API, aucun fournisseur branché) ; rien n'est déployé ni souscrit ; **aucun élève réel**.

## 1. Objectif et résultat

Objectif (plan validé, ADR 0061) : préparer ce qui servira dès la première classe du pilote, en attendant la clé API, le juriste et les référents.

| Étape du plan | État | Remarque |
|---|---|---|
| 1. Texte des élèves protégé | **Fait** | Numéros de téléphone, emails, liens et identifiants masqués avant le Professeur, l'Évaluateur et le Tuteur. Les nombres des exercices restent intacts ; les noms ne sont pas masqués (ADR 0062). |
| 2. Vue de l'enseignant de la classe | **Fait, en attente du juriste** | Classe du pilote rejointe par l'élève avec un code. L'enseignant ne voit que des chiffres d'ensemble, calculés et masqués par la base : rien sous 5 élèves, aucun nom ni aucune réponse (ADR 0063). |
| 3. Pages plus légères | **Fait, cible atteinte en partie** | +21 à 26 % de pages par seconde pour un processus. La cible (× 1,5) n'est atteinte qu'avec 2 processus par serveur (× 1,7) (ADR 0064). |
| 4. Passages réels des agents | **En attente** | Clé API et accord sur le coût (~115 USD). |
| 5. Démonstration et bilan | **Fait** | 6 captures ; ce document. |

**Le Jalon 9 sera clos** quand les passages réels auront atteint les seuils (étape 4). La vue de l'enseignant ne servira à de vrais élèves qu'après l'avis du juriste (Q19).

## 2. Défauts trouvés en cours de route (tous corrigés)

- **Masquage** : la règle de masquage du Support effaçait toute suite de 4 chiffres. Elle aurait effacé les nombres des exercices de maths : une règle propre aux agents pédagogiques a été écrite.
- **Vue de l'enseignant** : sur téléphone, le tableau de 6 colonnes cachait la moitié des chiffres (vu sur les captures). Il est remplacé par une carte par chapitre.
- **Mesure de charge** : les élèves fictifs réutilisés d'un passage à l'autre atteignaient la limite de 40 questions par jour au Professeur. Cette limite est voulue, mais elle comptait comme une erreur ; le script remet maintenant ces quotas à zéro, en base locale seulement.
- **Test fragile** : un test de base supposait l'avancement d'un élève fictif, modifié par un test précédent. Il fixe maintenant lui-même cet état, puis le rétablit.

## 3. Démonstration (captures sur téléphone, données et agents simulés)

Index et commande de régénération : [`docs/demo/jalon-9/README.md`](../demo/jalon-9/README.md).

| | Écran |
|---|---|
| 01 | [Numéro masqué dans une question au Professeur](../demo/jalon-9/01-question-numero-masque.png) |
| 02 | [Espace de l'élève : « Ma classe »](../demo/jalon-9/02-espace-eleve-ma-classe.png) |
| 03 | [Classe rejointe](../demo/jalon-9/03-eleve-a-rejoint-sa-classe.png) |
| 04 | [Activation de l'enseignant](../demo/jalon-9/04-enseignant-activation.png) |
| 05 | [Classe de moins de 5 élèves : masquée](../demo/jalon-9/05-enseignant-classe-masquee-moins-de-5.png) |
| 06 | [Chiffres d'ensemble de la classe](../demo/jalon-9/06-enseignant-tableau-de-la-classe.png) |

## 4. Ce que vérifient les tests

| Série | Nombre | Commande |
|---|---|---|
| Tests unitaires (dont masquage, SQL de création de classe, fichiers gardés en mémoire) | 246, tous passés | `pnpm test` |
| Base de données (dont E01 à E04 : classes et vue de l'enseignant) | 115 scénarios, tous passés | `pnpm test:base` |
| Bout en bout sur téléphone simulé (dont enseignant, masquage) | 91, tous passés | `pnpm test:e2e` |
| Tenue en charge | 200 élèves, rythme d'une classe : 95e centile 67 ms, aucune erreur | `pnpm charge` (base locale seulement) |
| Agents, mécanique sans coût | Inchangés : conformes sauf les non conformes connus de la simulation (Professeur TC-02, TC-09, TC-10, PR-03, PR-06 ; Évaluateur EV-02 à EV-04, EF-01, EF-02 ; Coordinateur CM-02, CM-12, CM-16) | `pnpm test:agents [--agent …]` |

## 5. Coûts

| Poste | Estimation | Statut |
|---|---|---|
| Passages réels complets de toutes les batteries | ~115 USD | Non lancés : clé et accord attendus |
| Dépenses du jalon | 0 USD ; aucune dépendance ajoutée | — |
| Hébergement | Prévoir 2 processus par serveur, ou un hébergement qui ajoute des instances lui-même (dossier de production §3.5) | Rien de souscrit |

## 6. Décisions et actions attendues du propriétaire

Les attentes des bilans précédents restent ouvertes (Jalon 8, §5) : juriste, clé API, référents, cadre du pilote, fournisseurs. S'y ajoutent :
1. **Question Q19 au juriste** : l'enseignant de la classe peut-il voir ces chiffres d'ensemble, et faut-il l'accord des parents ? Le dossier (en ligne, version 3) la contient déjà.
2. **Enseignant de la classe pilote** : à désigner avec l'établissement. Une fois l'avis du juriste rendu, créer la classe : `pnpm classe:creer` (guide de mise en route, étape F2 bis).
3. **Hébergement** : en choisissant l'hébergeur, tenir compte de la consigne des 2 processus par serveur.
