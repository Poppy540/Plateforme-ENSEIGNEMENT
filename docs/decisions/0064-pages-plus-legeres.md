# 0064 — Pages plus légères : moins d'allers-retours vers la base, fichiers gardés en mémoire

- **Date** : 2026-10-27 · **Statut** : appliqué (Jalon 9, étape 3).

## Contexte

La mesure du Jalon 8 (ADR 0059) plafonnait à environ 100 pages dynamiques par seconde pour un processus du serveur, limité par son processeur. Le plan du Jalon 9 (ADR 0061) visait au moins 1,5 fois plus. Un profil du processeur, pris sous charge (`node --cpu-prof`, 4 200 requêtes), a montré trois postes :
- **les allers-retours vers la base** : environ 12 % du temps. Chaque transaction en faisait 5 (début, rôle, identité, requête, fin), et une page en ouvre 5 à 10 ;
- **la relecture des fichiers du dépôt** à chaque page ou question : environ 3 %. Le pack pays, le nom du professeur et le prompt étaient relus et analysés (YAML) à chaque fois, et tous les `pays.yaml` étaient parcourus pour trouver le pack ;
- **le rendu de Next.js et React**, la compression des réponses et le ramasse-miettes : le reste, qui ne dépend pas de notre code.

## Décision

1. **Ouverture de transaction en un seul aller-retour** (`src/lib/serveur/base.ts`) : le début de transaction, le rôle, l'identité et le contexte de l'agent partent en une seule requête, au lieu de quatre. Une transaction fait donc 3 allers-retours au lieu de 5. Chaque valeur passe par `escapeLiteral` du pilote Postgres. Le rôle vient d'une liste fermée, vérifiée encore par une expression régulière : aucune saisie n'entre dans cette requête.
2. **Fichiers gardés en mémoire** (`src/lib/agents/chargeur-prompt.ts`) : `pays.yaml`, les valeurs des agents, les prompts, les règles communes et les skills sont lus une fois. Ils sont relus dès que leur date de modification change : une modification du pack est prise en compte aussitôt, sans redémarrage. Les valeurs gardées sont gelées, et l'appelant reçoit une copie des valeurs d'un agent.
3. **Écartés après mesure ou réflexion** :
   - une mémoire de quelques secondes sur l'interrupteur d'accès des élèves et la suspension des agents. Ce sont des arrêts d'urgence : ils doivent agir à la requête suivante ;
   - un réglage du ramasse-miettes (`--max-semi-space-size`) : aucun gain mesuré ;
   - la désactivation de la compression : elle compte pour les élèves à faible débit, sauf si l'hébergeur compresse lui-même.

## Mesures (poste à 4 cœurs, base locale, agents simulés ; médiane de 3 passages de 4 200 requêtes à saturation)

| | Pages par seconde | Médiane | 95e centile |
|---|---|---|---|
| Avant (un processus) | 95 | 2,2 s | 2,8 s |
| Après (un processus) | 115 à 120 (+21 à 26 %) | 1,8 s | 2,1 à 2,3 s |
| Après, 2 processus sur la même machine | 165 (× 1,7) | 1,25 s | 1,6 s |

Au rythme d'une classe (200 élèves, une page toutes les ~5 s) : médiane 25 ms, 95e centile 67 ms, aucune erreur. À une page par seconde : 95e centile 1,6 s (1,8 s avant).

## Conséquences

- La cible de 1,5 fois **par processus** n'est pas atteinte : le reste du temps est passé dans Next.js et React. Elle l'est **par serveur**, avec 2 processus : c'est la consigne du dossier de production (§3.5).
- Le script de charge accepte plusieurs adresses (`URL_CHARGE`, une par processus). Il remet à zéro les quotas du jour de ses élèves fictifs, en base locale seulement. Sinon la limite de questions au Professeur, voulue, compterait comme une erreur d'un passage à l'autre.
- Test unitaire : un fichier modifié est relu, et la copie rendue peut être modifiée sans toucher à la mémoire.
