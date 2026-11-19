# 0124 — Mises à jour mineures, actions GitHub et liens sans préchargement

- **Date** : 2026-11-19 · **Statut** : appliqué (Jalon 26, étape 1)

## Contexte

Dependabot proposait 6 actions GitHub (demande n° 3) et 8 mises à jour mineures (n° 4). Le contrôle de la n° 4 échouait sur le poids des pages. Sur la branche de travail, avec les mêmes versions, le contrôle de GitHub dépassait aussi le budget, selon les passages :

- la page des liens de prérequis du référent ;
- l'accueil de l'administration (186 Ko pour un budget de 175, 42 Ko rouverte pour 30).

Localement, ces pages restaient largement sous le budget.

Le détail par type de fichier, ajouté au message d'échec, a montré la cause : les scripts restaient à 140 Ko, mais les **données** montaient à 21 Ko et 31 Ko. Ce sont les pages liées que Next.js précharge d'avance quand leurs liens sont visibles. Leur nombre dépend de la vitesse de la machine (navigateur plus récent sur GitHub avec Playwright 1.65) : le résultat variait donc d'un passage à l'autre.

## Décision

1. **Mises à jour appliquées**, toutes publiées depuis au moins une semaine :
   - 6 actions GitHub, épinglées par empreinte comme avant ;
   - Supabase 2.119.0, React et React DOM 19.3.1, axe-core/playwright 4.14.0, Prettier 3.10.1, Vite 8.3.8, Vitest 5.1.0 ;
   - **Playwright 1.65.0** et non 1.65.1, publiée 6 jours avant.
2. **Pas de préchargement des pages liées** (`prefetch={false}`) sur les pages qui alignent beaucoup de liens : l'accueil de l'administration (17 liens), l'espace du référent (11) et la page des prérequis (un lien par chapitre). La page liée se charge au clic. Sur une connexion lente, rien n'est téléchargé d'avance pour des pages qu'on n'ouvrira peut-être pas. **Aucun budget n'est relevé.**
3. **Accessibilité** : axe-core 4.14 a relevé que les boutons « Nouveau code de classe » et « Nouvelle invitation d'enseignant » annonçaient au lecteur d'écran un autre texte que celui affiché (WCAG 2.5.3). Le nom annoncé commence désormais par le texte visible.
4. Le message d'échec du test de poids donne désormais le détail par type de fichier.

## Conséquences

- Contrôle complet 11 / 11 en local ; GitHub vert.
- **En local**, Playwright 1.65 attend un navigateur que cet environnement n'a pas : lancer les tests de bout en bout avec `CHEMIN_CHROMIUM=/opt/pw-browsers/chromium`. GitHub installe le sien.
- Une navigation depuis ces trois pages est un peu moins instantanée ; elle reste rapide, et ne coûte des données que pour la page réellement ouverte.
