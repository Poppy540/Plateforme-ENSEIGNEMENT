# 0030 — Agent Tuteur : analyse déterministe, plan rédigé par le Tuteur, décrochage signalé

- **Date** : 2026-10-06 · **Statut** : technique, conforme au prompt du Tuteur et au §5.2 · construit sans clé API (modèle simulé)

## Décision

1. **Analyse sans modèle** (`application/src/lib/agents/tuteur/analyse.ts`) : chapitres en difficulté (score < 50, dernier quiz sinon progression) ; remontée de **tout** le graphe de prérequis validé jusqu'à la notion de base fragile la plus profonde (en difficulté de préférence, sinon jamais travaillée), même d'une classe inférieure ; puis chapitres en cours et suivants. Au plus 8 candidats.
2. **Plan rédigé par le Tuteur** (un appel, sortie imposée par schéma JSON) : au plus **trois priorités choisies parmi les candidats** (numéro de la liste : aucun chapitre inventé), raison, temps estimé (≤ temps disponible par jour), message d'encouragement fondé sur les progrès, conseil de rythme, signalement (détresse, décrochage, situation difficile). Plan non conforme → rien d'enregistré.
3. **Élève** : page « Mon plan de révision » (préférences : temps par jour, connexion, rappels **désactivés par défaut** ; mise à jour du plan, 3 fois par jour au plus ; mot facultatif au Tuteur, traité comme une donnée). Les priorités renvoient aux chapitres.
4. **Décrochage** : détection planifiée (avec l'exécuteur de l'Orchestrateur) des élèves sans activité depuis 14 jours (`TUTEUR_INACTIVITE_JOURS`) : signalement à un humain (sans doublon) et message d'accueil bienveillant, tiré d'un modèle de message, affiché à son retour.
5. **Modèle** : `claude-opus-5-5`, effort `medium`, 8 000 jetons ; variables `MODELE_TUTEUR`, `EFFORT_TUTEUR`, `MAX_JETONS_TUTEUR`, `PLANS_PAR_JOUR`.
6. **Tests** : TC + TU par le lanceur (`pnpm test:agents --agent tuteur`, ~7 USD le passage réel) ; TU-03 et TU-04 (parents) avec l'étape 4.

## Limites

- L'examen visé et sa date ne sont pas encore transmis (à tirer de la structure du pack pays).
- Les rappels sont enregistrés comme préférence ; leur envoi viendra avec la messagerie réelle.
- Le graphe de prérequis chapitre par chapitre reste à poser et valider avec les référents : sans lui, le Tuteur s'appuie sur les difficultés et l'ordre des chapitres.
