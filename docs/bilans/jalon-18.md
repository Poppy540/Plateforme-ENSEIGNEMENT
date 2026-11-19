# Bilan du Jalon 18

**Dates** : 2026-10-30 au 2026-11-02 · **Branche** : `claude/gabon-education-platform-ldrr4p` · **Données** : fictives uniquement ; agents, messagerie et vidéo **simulés** (aucune clé API, aucun fournisseur branché) ; rien n'est déployé ni souscrit ; **aucun élève réel**.

## 1. Objectif et résultat

Objectif (plan validé, ADR 0098) : la plateforme sert surtout des téléphones d'entrée de gamme, sur un réseau lent, cher et coupé par moments. Il s'agissait de :

- mesurer toutes les pages dans ces conditions ;
- fixer et faire vérifier un budget par page ;
- alléger ce qui peut l'être ;
- étendre la lecture sans réseau.

| Étape du plan                | État           | Remarque                                                                                                                                                              |
| ---------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Mesure                    | **Faite**      | 41 pages sur 47, 5 publics, 2 réseaux simulés, processeur ralenti 4 fois (`pnpm mesurer:pages`).                                                                      |
| 2. Budgets vérifiés          | **Faite**      | Un budget par public sur toutes les pages, vérifié par `pnpm controler` et GitHub ; une page sans budget fait échouer les tests (ADR 0099).                           |
| 3. Allègement                | **Faite**      | Le code propre aux pages ne pèse que 4 à 8 Ko. Le levier est la compression du socle commun : brotli préparé par le paquet, −18 Ko par page en production (ADR 0100). |
| 4. Hors ligne étendu         | **Faite**      | **D14 b** : « Mes cours », chapitres d'une matière, plan de révision et corrections de quiz relus sans réseau, 7 jours au plus (ADR 0101).                            |
| 5. Passages réels des agents | **En attente** | Clé API, relecture des deux skills, accord sur le coût (~121 USD).                                                                                                    |
| 6. Bilan                     | **Fait**       | 5 captures ; nouvelle mesure de toutes les pages ; ce document.                                                                                                       |

**Le Jalon 18 sera clos** quand les passages réels auront atteint les seuils (étape 5, reprise des Jalons 11 à 17).

## 2. Ce que montrent les mesures

Tableau complet : [`docs/performance/mesures-pages.md`](../performance/mesures-pages.md) ; analyse : [`mesures-jalon-18.md`](../performance/mesures-jalon-18.md).

| Toutes les pages mesurées                     | Début du jalon | Fin du jalon           | Budget (ADR 0099)                                  |
| --------------------------------------------- | -------------- | ---------------------- | -------------------------------------------------- |
| Premier chargement (serveur seul, gzip)       | 146 à 158 Ko   | 145 à 156 Ko           | 160 Ko (élève, parent, visiteur) ; 175 Ko (autres) |
| Premier chargement en production, avec brotli | —              | environ 18 Ko de moins | —                                                  |
| Page rouverte                                 | 0 à 13 Ko      | 0 à 13 Ko              | 20 Ko ; 30 Ko                                      |
| Texte affiché en 2G                           | 1,4 à 1,6 s    | 1,4 à 1,6 s            | 2 s                                                |
| Page utilisable en 2G                         | 6,2 à 6,4 s    | 6,1 à 6,4 s            | 7,5 s                                              |

**Ce qu'il faut en retenir :**

- **L'élève lit vite**, en 1,4 s même en 2G : le texte arrive tout prêt du serveur.
- **Les boutons attendent le socle commun** (React et Next.js, 135 Ko). Ce socle ne se réduit pas sans changer d'outils, ce qui n'est pas proposé.
- **La deuxième visite est presque gratuite** : une page rouverte coûte 0 à 13 Ko.

## 3. Défauts trouvés en cours de route (tous corrigés)

- **Page jamais enregistrée dans le dépôt**, trouvée par la première intégration continue sur GitHub, une fois GitHub Actions débloqué. La page « Sort des données » (Jalon 14) était attrapée par la règle du `.gitignore` qui protège les dossiers de données réelles. Elle existait sur la machine de développement, mais un site construit depuis GitHub aurait affiché « Page introuvable ». Elle est désormais enregistrée, et un garde-fou fait échouer les tests si un fichier de code est ignoré par git.
- **Erreurs de ma propre mesure.** Le premier passage annonçait jusqu'à 480 Ko pour une page rouverte : il comptait des fichiers déjà sur le téléphone. L'outil compte désormais les octets réellement passés par le réseau. La piste « composant hors ligne sur toutes les pages » était fausse, elle aussi : un diagnostic page par page l'a montré avant toute modification.
- **Répétition générale qui laissait son serveur allumé** (depuis le Jalon 12) : le passage suivant ne pouvait plus tourner. C'est corrigé et vérifié.
- **Données de test qui débordaient** : le parcours des budgets laissait un brouillon de script et un rapport au parent qui faussaient deux autres tests. Il nettoie maintenant derrière lui.

## 4. Démonstration (captures sur téléphone, données fictives)

Index et commande de régénération : [`docs/demo/jalon-18/README.md`](../demo/jalon-18/README.md).

|     | Écran                                                                                                     |
| --- | --------------------------------------------------------------------------------------------------------- |
| 01  | [« Mes cours » sans réseau, avec la date de la copie](../demo/jalon-18/01-mes-cours-hors-ligne.png)       |
| 02  | [Chapitres d'une matière sans réseau](../demo/jalon-18/02-chapitres-matiere-hors-ligne.png)               |
| 03  | [Plan de révision sans réseau](../demo/jalon-18/03-plan-hors-ligne.png)                                   |
| 04  | [Correction du quiz sans réseau](../demo/jalon-18/04-correction-quiz-hors-ligne.png)                      |
| 05  | [« Pas de connexion » et liste des pages gardées](../demo/jalon-18/05-pas-de-connexion-pages-gardees.png) |

## 5. Ce que vérifient les tests

Dernier contrôle complet (`pnpm controler`) : **9 / 9 réussis**. GitHub Actions est **au vert** depuis le passage n° 92.

| Série                                                                                                                                                      | Nombre           | Commande              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | --------------------- |
| Tests unitaires (dont budgets et couverture de toutes les pages, compression vérifiée sur le site, sources suivies par git)                                | 328, tous passés | `pnpm test`           |
| Base, migrations, sauvegarde S01 à S06                                                                                                                     | Passés           | dans `pnpm controler` |
| Bout en bout (dont les budgets des 41 pages, et la lecture sans réseau étendue : copie datée, quiz à faire jamais gardé, copie de plus de 7 jours refusée) | 118, tous passés | `pnpm test:e2e`       |
| Répétition générale du déploiement (paquet précompressé en brotli)                                                                                         | 12 / 12          | `pnpm repetition`     |

## 6. Coûts

| Poste                                           | Estimation                        | Statut                                                    |
| ----------------------------------------------- | --------------------------------- | --------------------------------------------------------- |
| Passages réels complets de toutes les batteries | ~121 USD                          | Non lancés : clé, relecture des skills et accord attendus |
| Dépenses du jalon                               | 0 USD ; aucune dépendance ajoutée | —                                                         |

## 7. Décisions et actions attendues du propriétaire

**Toujours au même endroit** : [`docs/attentes-proprietaire.md`](../attentes-proprietaire.md), et la page « Ce qui vous attend » de l'administration. Ce jalon ajoute :

- **pour le juriste**, la question **Q20** : la durée de 7 jours des copies gardées sur le téléphone convient-elle ? Elle figure aussi dans le dossier, au risque R11 ;
- **au déploiement**, si l'hébergement est un serveur, utiliser l'exemple Caddy, qui sert les fichiers en brotli ; `pnpm verifier:site` le contrôle ;
- **sur GitHub** (dépôt désormais public), les réglages de sécurité recommandés :
  - analyse des secrets avec protection à l'envoi ;
  - alertes Dependabot ;
  - approbation des flux pour les contributeurs externes ;
  - protection de `main` ;
  - adresse email privée.

Le plus urgent reste inchangé :

- trouver le juriste et lui transmettre le dossier, qui contient maintenant T12, R11 et Q20 ;
- la clé API et l'accord sur le coût ;
- la relecture des deux skills ;
- le premier référent.
