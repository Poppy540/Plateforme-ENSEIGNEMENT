# 0031 — Rapports du Tuteur aux parents

- **Date** : 2026-10-06 · **Statut** : technique, conforme à l'ADR 0027 (hebdomadaires et à la demande, consentement séparé) · modèle et messagerie simulés
- **Migration** : 0016 · **Tests** : RP01-RP04, bout en bout, TU-03 et TU-04

## Décision

1. **Accord séparé** (consentement `rapport_parents`, distinct de l'inscription) : **demandé par l'élève** depuis « Mon plan de révision », envoyé au contact donné à l'inscription (à défaut, pour un élève majeur, au contact qu'il indique) ; **accepté par le parent** par un lien à usage unique (empreinte seule en base, accord enregistré au clic, pas à l'ouverture) ; **révocable** par l'élève à tout moment et par le parent depuis tout rapport reçu.
2. **Rapport** : faits de la semaine calculés par la plateforme (chapitres terminés et en cours, scores des quiz, priorités du plan, dernière activité ; jamais d'autre élève) ; texte rédigé par le Tuteur (progression, au plus 3 points forts, 3 points à renforcer, 3 suggestions ; sans comparaison, diagnostic ni promesse), sortie imposée et contrôlée. La base refuse tout rapport sans accord actif.
3. **Envoi** par un **service de messagerie** (rôle `service_messagerie`, aucun autre droit) qui seul obtient le contact du parent, une fois par rapport, avec un **lien propre à ce rapport**. Le Tuteur ne voit jamais le contact. Le texte du message ne recopie pas le contact.
4. **Fréquence** : chaque semaine (appel planifié de l'exécuteur, rapports dus depuis 7 jours) et **à la demande du parent** (depuis le lien d'un rapport, un par jour au plus).
5. **Page du parent** (sans compte, par le lien du rapport) : le rapport complet, une question au Tuteur (traitée comme une donnée ; jamais de comparaison ni de classement ; sans accord actif, aucune information et la procédure expliquée ; une demande hors périmètre est transmise à un humain), « recevoir un rapport maintenant », « ne plus recevoir de rapports ».

## Limites

- Messagerie simulée (`/developpement/messages`) tant que le fournisseur SMS/email n'est pas choisi ; les modèles de messages sont à faire valider.
- Vérifier avec le juriste au Gabon : accord d'un seul parent suffisant, élèves majeurs, durée de conservation des rapports.
