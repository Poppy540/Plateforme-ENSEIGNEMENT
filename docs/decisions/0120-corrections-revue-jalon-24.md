# 0120 — Corrections de la revue de sécurité du Jalon 24

- **Date** : 2026-11-12 · **Statut** : appliqué (Jalon 24, étape 2)

## Contexte

La revue des Jalons 16 à 23 (`docs/securite/revue-jalon-24.md`) relève 1 constat moyen, 7 faibles et 7 pour information. Les constats qui ne demandent pas de décision du propriétaire sont corrigés ici, chacun avec un test. S12 et le volet « Claude Code » de S17 attendent les décisions D17 et D18.

## Décision

| Constat | Correction                                                                                                                                                                                                      | Test                                                      |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| S10     | La suppression du compte efface d'abord les copies du téléphone (comme la déconnexion) ; l'accueil efface aussi tout ce qui reste quand aucune session n'est ouverte.                                           | `suppression-copies.spec.ts`                              |
| S11     | `estBaseLocale` décide sur l'hôte que le pilote Postgres joindra vraiment : `host` ou `hostaddr` dans l'adresse, liste d'hôtes, `PGHOST` ; la tenue en charge utilise la même fonction et refuse la production. | `entrainement.test.ts` (adresses piégées)                 |
| S13     | `noter_visionnage` (migration 0051) ne note « commencé » et ne compte que les chapitres du pays de l'élève, après le quota.                                                                                     | PC05                                                      |
| S14     | Commentaire de la route de visionnage et ADR 0103 corrigés ; le registre du dossier pour le juriste (T3) décrivait déjà le traitement.                                                                          | —                                                         |
| S15     | La clé API n'est donnée qu'aux deux étapes du passage réel qui l'utilisent.                                                                                                                                     | `flux-github.test.ts`                                     |
| S16     | `persist-credentials: false` sur chaque checkout.                                                                                                                                                               | `flux-github.test.ts`                                     |
| S17     | `.gitignore` racine : `sauvegardes/`, `*.dump`, `*.age`, `cle-sauvegardes*`, où qu'ils soient.                                                                                                                  | `sources-suivies.test.ts`                                 |
| S18     | `rejoindre_classe` verrouille la classe avant de compter les places (migration 0051).                                                                                                                           | Base (CC01, CC02 inchangés)                               |
| S19     | Le garde-fou GF03 contrôle aussi les droits accordés colonne par colonne au visiteur.                                                                                                                           | GF03                                                      |
| S20     | Mot du pays pour les séries : 1 à 40 caractères (migration 0051).                                                                                                                                               | Base (import des packs)                                   |
| S21     | Les copies hors ligne gardent et renvoient la politique de contenu et les en-têtes de sécurité de la page d'origine.                                                                                            | `hors-ligne-etendu.spec.ts`                               |
| S22     | Les messages « ?erreur= » et « ?ok= » des pages d'administration et de conformité ne s'affichent que signés par le serveur (`src/lib/message-signe.ts`).                                                        | `message-signe.test.ts`, `classes-administration.spec.ts` |
| S23     | Numéros des tests de normalisation remplacés par des numéros fictifs.                                                                                                                                           | —                                                         |
| S24     | Les rapports de contrôle masquent aussi `DATABASE_URL` et le mot de passe de toute adresse de base écrite dans une sortie.                                                                                      | `controle.test.ts`                                        |

## Conséquences

- Le dossier pour le juriste dit que la suppression du compte efface les copies du téléphone, et qu'un appareil resté sans réseau ne peut pas l'être à distance.
- Un lien d'administration avec un message non signé s'affiche sans le message. Aucun élève n'était concerné : les pages d'élève ne lisent pas de message dans l'adresse.
