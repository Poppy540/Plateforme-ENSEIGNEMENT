# 0026 — Revue, publication et lecture des vidéos

- **Date** : 2026-10-05 · **Statut** : technique, conforme au cadrage (validation humaine, publication par un humain, faible débit) · vidéos **simulées** tant qu'aucun hébergeur n'est branché

## Décision

1. **Revue par le référent** (page de la vidéo, accessible depuis le tableau de bord ou le journal de production du script) : lecteur, rapport de production (contrôles, anomalies, versions, coût). Pour valider, il doit confirmer avoir regardé toute la vidéo avec les sous-titres et vérifié synchronisation, son, lisibilité et anomalies (case obligatoire, contrôlée par le serveur). Rejet avec commentaire obligatoire ; ensuite, nouvelle production ou révision du script.
2. **Publication = acte distinct**, après validation seulement (`publier_video`, vérifié par la base), avec confirmation explicite ; tracée dans `approbations` (`publication_video`).
3. **Lecture par l'élève** : la dernière vidéo publiée d'un chapitre validé, servie par la fonction `videos_publiees_du_chapitre` (référence, durée, versions, sous-titres), sans script ni rapport. Sous-titres WebVTT via `/api/videos/<id>/sous-titres`, réservés aux utilisateurs qui peuvent voir la vidéo.
4. **Lecteur faible débit** : rien n'est téléchargé avant « lecture » (`preload="none"`), version la plus légère par défaut (240p), consommation affichée en Mo par minute pour chaque version, changement de qualité sans perdre la position, sous-titres français activés, largeur fluide sur téléphone. Le choix de qualité n'est pas mémorisé d'une page à l'autre (on repart de la plus légère).
5. **Simulation** : une vidéo de démonstration de 6 secondes en 240p (fond uni, silence, WebM VP9 + MP4 H.264, moins de 10 Ko chacun) dans `application/public/simulation/`, régénérable par `scripts/generer-video-simulee.sh` ; chaque version simulée pointe vers ce fichier. Une référence d'hébergeur non pris en charge affiche « lecture indisponible » plutôt que de faire semblant.

## Avec un vrai hébergeur

Implémenter `sourcesLecture` pour l'hébergeur retenu (par exemple lecture adaptative HLS démarrant au plus bas débit), version téléchargeable pour le hors-ligne si le fournisseur la propose, et mesurer la consommation réelle.
