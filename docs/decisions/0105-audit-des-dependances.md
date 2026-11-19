# 0105 — Audit des dépendances à chaque contrôle

- **Date** : 2026-11-02 · **Statut** : accepté (Jalon 20, étape 1)

## Contexte

Le premier audit des dépendances (`docs/securite/dependances-jalon-20.md`) a trouvé 12 failles connues. Dont **deux critiques et une élevée dans Next.js 16.3.8**, le cadre de l'application : la plateforme utilise les actions serveur que touche la faille élevée. Rien ne surveillait les dépendances jusqu'ici.

## Décision

- **Corrections** :
  - Next.js 16.4.3 ;
  - Vitest 5.0.5 et Vite 8.3.5 ;
  - zod 4.6.7 (version forcée).

  Chaque fois, la dernière version publiée depuis au moins une semaine. Aucune ne change de version majeure.

- **`pnpm audit:dependances`**, dans `pnpm controler` dès le niveau rapide :
  - une faille élevée ou critique sans exception valide fait échouer ;
  - une exception expirée ou mal écrite fait échouer aussi ;
  - les failles faibles et modérées sont signalées.
- **Exceptions écrites** (`application/exceptions-audit.json`) : identifiant de la faille, paquet, raison d'au moins 20 caractères, date de fin. Une seule aujourd'hui : minimatch, outil de développement, jusqu'au 2027-01-31.
- **Version majeure** : une mise à jour qui change de version majeure passe par l'accord du propriétaire (ADR 0104).

## Conséquences

- Une faille nouvellement publiée peut faire échouer le contrôle sans aucun changement du code. C'est voulu : elle se corrige ou s'excuse par écrit.
- Les alertes et propositions automatiques de mise à jour (Dependabot) viennent à l'étape 2.
