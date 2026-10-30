# Ce qui vous attend

**À jour au 2026-10-28 (Jalon 15).** C'est la liste unique de ce que les bilans des Jalons 6 à 14 vous demandent. Les nouveaux bilans renvoient ici au lieu de répéter leurs listes.

Dans la plateforme, la page **« Ce qui vous attend »** (`/administration/attentes`, ADR 0089) montre la même liste. Elle vérifie elle-même les points qu'elle peut voir : conditions du pilote, dates, chapitres, classe, questionnaire, seuils, skills encore « à valider ». Les points marqués _(à confirmer)_ ne sont visibles que de vous : cochez-les ici au fil de l'eau.

L'ordre conseillé est celui du [guide de mise en route](mise-en-route.md).

## Juriste

- [ ] <!-- attente:juriste --> **Avis écrit du juriste.** Il porte sur le dossier, la question Q19 (l'enseignant de la classe), les durées de conservation, la fiche « Après l'essai » et la version établissement des rapports. Où agir : [dossier pour le juriste](juridique/dossier-juriste.md), puis la condition 1. Débloque : la classe pilote, les durées, la décision de démarrer.

## Cadre du pilote, avec l'établissement

- [ ] <!-- attente:etablissement --> **Accord écrit de l'établissement** (condition 2).
- [ ] <!-- attente:dates --> **Dates du pilote et format du rapport de fin**, fixés avec l'établissement. Saisie : « Rapport de fin de pilote ».
- [ ] <!-- attente:chapitres --> **Chapitres du pilote** désignés : « Chapitres du pilote ».
- [ ] <!-- attente:classe --> **Classe pilote créée et enseignant invité**, après la réponse du juriste à Q19 : « Classes du pilote ». Saisir comme capacité l'effectif annoncé par l'établissement (décision D10).

## Référents et contenus

- [ ] <!-- attente:referents --> **Référents recrutés et invités** : Mathématiques d'abord, puis Sciences et Français (condition 3 ; [guide du référent](pilote/guide-referent.md)). Avec le premier référent, ajuster les temps indicatifs de sa page d'accueil.
- [ ] <!-- attente:contenus --> **3 à 5 chapitres du pilote validés** par le référent : chapitre, script et quiz (condition 4).
- [ ] <!-- attente:valeurs --> **Valeurs provisoires du pack validées** (FAQ, délais, fiches des agents, durées), avec le référent et le juriste (condition 10).
- [ ] <!-- attente:questionnaire --> **Questionnaire anonyme validé** : passer `statut` à `valide` dans `questionnaire.yaml` du pack.

## Agents : relecture, clé et essais réels

- [ ] <!-- attente:skills --> **Skills relues et validées** : « élèves mineurs » (`agents/_commun/skills/eleves-mineurs/SKILL.md`) et « files d'approbation » (`agents/coordinateur/skills/files-d-approbation/SKILL.md`). Une fois validée, remplacer dans le fichier « À valider par le propriétaire » par « Validée par le propriétaire le … ».
- [ ] <!-- attente:cle_api --> **Clé API et accord sur le coût des essais réels** (~121 USD ; mini-essais d'abord). La clé va dans l'environnement du serveur, jamais dans la conversation (condition 5).
- [ ] <!-- attente:seuils --> **Seuils du suivi validés et budget des agents par semaine fixé** : section `pilote` de `pays.yaml`, puis `SOURCES.md` (condition 11).

## Hébergement, fournisseurs et déploiement

- [ ] <!-- attente:hebergement --> **Hébergement choisi et déployé**, avec 2 processus par serveur, ainsi que Supabase, les sauvegardes chiffrées avec `age` (clé privée gardée hors du serveur, dossier de production §5) et une restauration essayée. `SEL_OPPOSITION` est fixé une fois pour toutes. Avant de déployer : `pnpm controler` sur une copie propre (il comprend la répétition générale), puis `pnpm paquet` ; le `CONTROLE.md` du paquet déployé doit dire « contrôle complet réussi » (condition 6, décision D13).
- [ ] <!-- attente:messages --> **SMS ou emails réels** branchés et modèles de messages approuvés (condition 7).
- [ ] <!-- attente:veille --> **Équipe de veille nommée et alerte de détresse testée** sur un vrai téléphone (conditions 8 et 9).
- [ ] <!-- attente:repetition --> **Répétition refaite sur le site déployé.** `pnpm verifier:site https://<adresse>` doit finir par « Site conforme » ; noter aussi le premier essai de restauration et l'outil de chiffrement des copies (condition 12).
- [ ] <!-- attente:github --> _(à confirmer)_ **GitHub Actions débloqué** : réglages du dépôt (Settings → Actions) et facturation du compte. Aucune machine n'est attribuée aux tâches depuis au moins le 19 octobre.

## Pendant et après le pilote

- [ ] <!-- attente:suivi --> _(à confirmer)_ **Chaque semaine** : « Critères de suspension », « Semaine du pilote », puis le point au journal.
- [ ] <!-- attente:fin --> _(à confirmer)_ **À la fin** : « Clôture du pilote » jusqu'à 8 / 8, puis « Sort des données » avec le juriste.

## Facultatif

- [ ] <!-- attente:avatar --> _(à confirmer)_ **Fournisseur d'avatar** et son tarif. Sans lui, le pilote s'appuie sur les leçons écrites.
- [ ] <!-- attente:surveillance --> _(à confirmer)_ **Service de surveillance des erreurs.**
- [ ] <!-- attente:lecteur_ecran --> _(à confirmer)_ **Essai avec un lecteur d'écran** (TalkBack) sur un téléphone d'entrée de gamme, avec l'établissement.
