# 0121 — Décisions D17 et D18 de la revue du Jalon 24

- **Date** : 2026-11-16 · **Statut** : décidé par le propriétaire et appliqué (Jalon 24, étape 3)

## Contexte

La revue du Jalon 24 (`docs/securite/revue-jalon-24.md`, §5) laissait deux points au propriétaire :

- **S12** : un téléphone perdu et resté sans réseau garde ses copies de lecture hors ligne au plus 7 jours, même après « Déconnecter mes appareils ». Rien ne peut les effacer à distance sans réseau.
- **S17** : la clé privée des sauvegardes et les sauvegardes n'étaient pas dans les interdictions de lecture de Claude Code.

## Décision

**D17 a — Le dire clairement.** La lecture hors ligne ne change pas. La limite est écrite :

- dans « Mes données », sous « Me déconnecter de tous mes appareils », pour les élèves (les pages de l'équipe ne sont jamais gardées hors ligne) ;
- dans la fiche d'information des familles, avec la conduite à tenir en cas de téléphone perdu ou volé ;
- dans le dossier pour le juriste (§6 et R11), depuis l'étape 2. La durée reste soumise au juriste (Q20).

**D18 — Oui.** `.claude/settings.json` interdit aussi à Claude Code la lecture de :

- `cle-sauvegardes*` ;
- `*.age` ;
- `sauvegardes/` et `application/sauvegardes/`.

Aucune règle existante n'est retirée ni affaiblie.

## Conséquences

- Un test de bout en bout vérifie que la phrase est affichée à l'élève (`decisions-securite.spec.ts`).
- Écartés pour D17 : une durée réduite à 2 jours pour les pages contenant un texte de l'élève, et l'arrêt de leur lecture hors ligne. L'un ou l'autre se reprend si le juriste le demande (Q20).
