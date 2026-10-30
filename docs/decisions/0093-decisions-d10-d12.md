# 0093 — Décisions D10 à D12 de la revue du Jalon 16

- **Date** : 2026-10-30 · **Statut** : décidé par le propriétaire (« D10 c, D11 a, D12 a ») et appliqué (Jalon 16, étape 3).

## Contexte

La revue de sécurité des Jalons 9 à 15 (`docs/securite/revue-jalon-16.md`) a soumis trois choix au propriétaire. Ils portent sur :

- le code de classe partagé (S2) ;
- l'inférence par différence dans la vue de l'enseignant (S3) ;
- le chiffrement des sauvegardes (S9).

## Décisions

### D10 c — capacité de chaque classe

- La capacité est l'effectif annoncé, de 1 à 200. Elle est **obligatoire à la création** depuis l'administration et modifiable sur la liste des classes. Le script de secours `pnpm classe:creer` prend `--capacite`. Une classe créée avant cette décision reste sans limite tant qu'on ne lui en donne pas.
- Quand la classe est pleine, `rejoindre_classe` ne rattache pas l'élève et renvoie `null`. L'élève lit : « Cette classe est complète. Demande à ton enseignant de vérifier le code de la classe. »
- La base ajoute alors **une** alerte dans la file humaine (source « Plateforme », priorité 2). Elle donne le nom de la classe et sa capacité, **sans l'élève qui a essayé**, et n'est pas répétée tant qu'elle n'est pas traitée.
- Un élève déjà dans la classe peut ressaisir le code sans être compté deux fois.
- La liste des classes affiche « Élèves rattachés : N sur C (capacité) ».
- Chaque changement de capacité est tracé (`capacite_classe`).
- Base : migration 0048 (colonne `capacite`, `definir_capacite_classe`, `rejoindre_classe` et `classes_admin` mises à jour).

### D11 a — chiffres de l'enseignant à jour à chaque lecture

Aucun changement. Le gel hebdomadaire (choix b) reste possible si le juriste le demande dans sa réponse à Q19.

### D12 a — sauvegardes chiffrées avec `age`

- La clé est créée sur le poste du propriétaire (`age-keygen`). Seule la **clé publique** va sur le serveur (`SAUVEGARDE_DESTINATAIRE_AGE`). La **clé privée** n'y va jamais, et une seconde copie est gardée hors ligne.
- `pnpm base:sauvegarder` envoie `pg_dump` directement dans `age` : **aucun fichier en clair** sur le disque. Le fichier produit est `base.dump.age`, et les empreintes portent sur lui, ce qui permet de vérifier l'intégrité sans la clé.
- **En production, une sauvegarde sans clé publique est refusée.** Hors production, elle reste possible, avec un avertissement.
- `pnpm base:restaurer` déchiffre avec `SAUVEGARDE_IDENTITE_AGE` (chemin du fichier de clé privée, jamais affiché) dans un dossier temporaire privé, effacé à la sortie. Sans clé, il refuse sans rien faire.
- `pnpm verifier:production` et la condition 6 du pilote exigent une clé publique `age1…` valide. Une clé privée collée par erreur est refusée et jamais affichée.
- L'outil `age` (libre) est à installer sur le serveur par le propriétaire. L'intégration continue l'installe pour ses essais.

## Régression trouvée en appliquant D12

En relançant `pnpm repetition`, le **paquet de déploiement a été refusé**. La page « Ce qui vous attend » (ADR 0089) lisait les skills avec un chemin calculé depuis la racine du dépôt. Le traçage de Next.js a donc embarqué tout le dépôt, tests compris. Le contrôle du paquet (ADR 0076) a joué son rôle.

La lecture passe désormais par `agents/<chemin>/SKILL.md`, comme le chargeur de prompts : seul `agents/`, déjà livré, est tracé. L'intégration continue l'aurait vu au Jalon 15 si elle tournait (bilan du Jalon 12, §5).

## Tests

- Base : CC01 (capacité réservée à l'administration, bornée, tracée) et CC02 (classe pleine : élève non rattaché, une seule alerte sans élève, re-saisie par un membre acceptée).
- Sauvegarde :
  - S05 : copie chiffrée, sans clair à côté, refusée sans clé privée, restaurée avec elle ;
  - S06 : en production, une copie en clair est refusée et ne laisse aucun fichier.
- Unitaires : clé publique `age` exigée, clé privée refusée et jamais affichée.
- Bout en bout : classe de capacité 1 ; le deuxième élève est refusé ; l'alerte est dans la file humaine ; la capacité relevée à 2 permet de rejoindre la classe ; 116 tests.
- Répétition générale : 12 étapes réussies, dont la sauvegarde chiffrée avec une clé fictive.
