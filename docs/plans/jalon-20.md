# Plan du Jalon 20 — sécurité du dépôt public

**Statut** : validé par le propriétaire le 2026-11-02 (piste choisie, ADR 0104). Étape 1 faite : 12 failles trouvées dont 2 critiques dans Next.js, corrigées (Next.js 16.4.3) ; audit dans `pnpm controler` (ADR 0105). Étape 2 faite : actions épinglées, CodeQL, Dependabot, SECURITY.md (ADR 0106). Étape 3 faite : [guide des réglages](../securite/reglages-github.md) et `pnpm verifier:depot` (ADR 0107).

**Objectif** : le dépôt est public depuis le Jalon 18. Tout le monde peut lire le code et voir ses dépendances. La revue du Jalon 18 a montré qu'aucun secret n'a jamais été commité. Restent trois risques :

- une **dépendance** qui présente une faille connue, et qui n'est pas mise à jour ;
- une **erreur dans le code** qu'un outil d'analyse aurait vue ;
- une personne qui trouve une faille et **ne sait pas à qui la signaler**.

Le Jalon 20 traite ces trois risques, avec des outils gratuits pour un dépôt public, et prépare pas à pas les réglages GitHub qui reviennent au propriétaire. **Rien n'est déployé ni souscrit.**

**Principes inchangés** :

- données fictives seulement ;
- aucun secret lu ni affiché ;
- aucun prompt d'agent modifié ;
- aucune dépendance nouvelle sans accord ;
- toute mise à jour de dépendance passe par `pnpm controler`.

## Étapes (dans cet ordre)

| #   | Étape                          | Contenu                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Besoin du propriétaire                               |
| --- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 0   | Plan                           | Ce plan, l'ADR 0104 et `memory.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Validation (faite)                                   |
| 1   | Audit des dépendances          | **État des lieux** : `pnpm audit` sur toutes les dépendances, directes et indirectes, consigné dans `docs/securite/dependances-jalon-20.md`. Chaque faille est classée : réellement atteignable par la plateforme, ou seulement présente. **Corrections** : mise à jour des paquets concernés, chacune vérifiée par `pnpm controler`. **Garde-fou** : `pnpm controler` lance l'audit et échoue sur une faille élevée ou critique ; une exception exige une raison écrite et une date de fin. | Accord si une mise à jour change une version majeure |
| 2   | Outils de GitHub dans le dépôt | **Dependabot** (`.github/dependabot.yml`) : alertes, et propositions de mise à jour regroupées, une fois par semaine, pour les paquets et les actions GitHub. **CodeQL** : analyse du code TypeScript à chaque envoi et chaque semaine. **Actions épinglées** : chaque action du flux est fixée à une empreinte précise, plus seulement à une étiquette (`@v4`). **SECURITY.md** : comment signaler une faille en privé, et ce qui se passe ensuite.                                         | —                                                    |
| 3   | Réglages GitHub (par vous)     | **Guide pas à pas avec captures d'écran décrites** : analyse des secrets et protection à l'envoi, alertes Dependabot, signalement privé des failles, protection de la branche principale, approbation des flux pour les contributeurs externes, adresse email privée. Une **vérification** `pnpm verifier:depot` lit ensuite, en lecture seule, ce que l'API publique de GitHub dit du dépôt, et liste ce qui manque.                                                                        | Les réglages eux-mêmes                               |
| 4   | Passages réels des agents      | Repris des jalons précédents : dès que la clé, la relecture des skills et l'accord sont là.                                                                                                                                                                                                                                                                                                                                                                                                  | Clé API ; accord sur chaque coût                     |
| 5   | Bilan                          | Bilan comme aux jalons précédents.                                                                                                                                                                                                                                                                                                                                                                                                                                                           | —                                                    |

L'étape 4 s'insère dès que la clé arrive.

## Décisions du propriétaire (2026-11-02)

1. **Piste retenue** : sécurité du dépôt public.
2. **Écartés pour ce jalon** :
   - le programme du pilote complet ;
   - la preuve d'exportabilité ;
   - une nouvelle matière de 3e.

## Hors Jalon 20

- Tout service de sécurité payant.
- Un test d'intrusion du site déployé : après le déploiement, avec votre accord sur le coût.
- Le déploiement et toute souscription.
