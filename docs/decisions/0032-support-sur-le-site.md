# 0032 — Agent Support/inscription sur le site

- **Date** : 2026-10-06 · **Statut** : technique, conforme à l'ADR 0027 (site d'abord) et au §5.2 · construit sans clé API (modèle simulé)
- **Migration** : aucune (droits posés par l'ADR 0028) · **Tests** : unitaires, SU-01 à SU-08 et TC (lanceur), bout en bout

## Décision

1. **FAQ dans le pack pays** (`referentiels/<pays>/faq.yaml`) : entrées (identifiant, question, réponse), statut et délai de réponse annoncé pour un ticket. Tant que le délai est `null`, le Support n'annonce aucun délai chiffré. La FAQ du Gabon est **provisoire** (`a_valider`) ; la page l'indique.
2. **Page `/aide`** : la FAQ est lisible par tous, sans modèle de langage. L'assistant est réservé aux personnes **connectées**, y compris pendant l'inscription, ce qui limite les abus et les coûts. Il est limité à 1 000 caractères par message et à 20 questions par jour (`QUESTIONS_SUPPORT_PAR_JOUR`).
3. **Un appel par message, sortie imposée** (schéma JSON) : réponse, entrées de FAQ utilisées, action (`aucune`, `orienter_professeur`, `ouvrir_ticket`, `escalade_humain`), catégorie, priorité et résumé de ticket. Le message reçu est isolé dans `<message>` comme une donnée. La conversation n'est **pas enregistrée**.
4. **Contrôles du serveur** : une entrée de FAQ citée doit exister ; une détresse doit être en priorité 1 et escaladée ; un ticket doit avoir un résumé. Une sortie non conforme ou illisible n'est pas montrée : un ticket « à reprendre par un humain » est ouvert et une réponse générique est affichée.
5. **Écritures** sous le rôle `agent_support`, pour la seule personne qui écrit :
   - un ticket pour `ouvrir_ticket` ou `escalade_humain`, rattaché à l'élève s'il a un compte, sinon sans demandeur ;
   - en cas de détresse, en plus du ticket, un signalement de priorité 1.
   Les suites de chiffres qui ressemblent à un code ou à une carte sont masquées avant enregistrement. Le Support n'a aucun outil pour payer, rembourser, supprimer un compte, envoyer un message ni lire l'historique d'un élève.
6. **Contexte donné au modèle** : la FAQ, les classes et séries du référentiel (lues en base, venues du pack), le statut du compte. Rien d'autre sur la personne.

## Limites

- WhatsApp Business plus tard : fournisseur, coûts et modèles de messages à faire approuver.
- Le traitement des tickets par un humain (liste, réponse, clôture) sera ajouté à l'administration ; en attendant, les tickets sont en base.
- Le quota de questions est tenu en mémoire du serveur. Il sera à reprendre en base avant un déploiement à plusieurs instances.
- La FAQ et le délai de réponse aux tickets sont à valider par le propriétaire.
