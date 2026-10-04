# 0023 — Validation des scripts par l'enseignant-référent

- **Date** : 2026-10-04 · **Statut** : technique, conforme au cadrage (validation humaine avant toute production) · Jalon 2, étape 3

## Décision

1. **Où** : l'espace référent liste les « scripts à relire » de ses familles (sujets sensibles en premier). La page d'un script montre le texte parlé, les indications visuelles, les points [À VÉRIFIER] surlignés, la mention « à relire en priorité », puis le formulaire de décision et l'historique.
2. **Décision** : valider ou rejeter **la version affichée** (`valider_contenu`, ADR 0021 : référent de la famille, version relue, une seule décision par version, tracée avec l'empreinte). Un commentaire est obligatoire pour rejeter.
3. **Confirmation explicite** : si le script contient des points [À VÉRIFIER], des exemples locaux à valider ou un sujet sensible, le référent doit cocher « j'ai vérifié… » pour valider. Contrôle fait par le serveur.
4. **Corrections = nouvelle version** : le contenu d'un script ne se modifie jamais. Le référent demande une **révision** au Scénariste (corrections reprises du commentaire de rejet, modifiables) : la version précédente est transmise comme donnée, et une nouvelle version au statut brouillon est créée, à relire et valider à son tour. La révision compte dans la limite quotidienne de brouillons.
5. **Plusieurs versions validées** possibles pour un chapitre : la production vidéo (étape 5) partira d'une version validée précise, en vérifiant version et empreinte.

## Non retenu

- Édition directe du texte par le référent dans la plateforme : à rediscuter avec les premiers référents (il faudrait alors tracer l'auteur humain de la version et la faire valider par un second regard).
