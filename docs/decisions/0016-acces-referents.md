# 0016 — Accès des enseignants-référents et espace de validation

- **Date** : 2026-10-04 · **Statut** : appliquée (Jalon 1, étape 6)
- **Devenir référent** : uniquement par une **invitation à usage unique** créée par le propriétaire après sa décision de recrutement (ADR 0010) : `pnpm referent:invitation <référentiel> <famille[,famille]> [jours]`. Le code (par exemple `ABCD-EFGH-JKMN`, sans caractères ambigus) s'affiche une seule fois ; la base ne garde que son empreinte. Validité : 1 à 60 jours (14 par défaut).
- Le référent se connecte comme un élève (code SMS), puis saisit son code d'invitation sur `/referent/activer`. Un compte déjà utilisé comme élève ou parent ne peut pas devenir référent. Le code ne sert qu'une fois.
- **Espace `/referent`** : chapitres « à valider » de ses familles de matières seulement, détail d'un chapitre (sous-thèmes, version, empreinte, volume horaire, coefficient, historique des décisions), **valider** ou **rejeter** (commentaire obligatoire en cas de rejet).
- **Garanties** (en base, ADR 0014) : la validation porte sur la **version relue** ; si le chapitre change pendant la relecture, la validation est refusée et le référent relit la nouvelle version. Chaque décision est tracée (valideur, date, version, empreinte, commentaire). Correction : une validation sans version indiquée est désormais refusée.
- Plus tard : l'agent Recruteur demandera la création de l'invitation, que le propriétaire approuve (Partie E, étape 9).
