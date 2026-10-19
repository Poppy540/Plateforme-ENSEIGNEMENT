# 0043 — Revue de sécurité et de confidentialité (Jalon 5, étape 0)

- **Date** : 2026-10-21 · **Statut** : technique ; points D1 à D9 à décider par le propriétaire
- **Migrations** : 0025, 0026 · **Tests** : S01-S06 (base), tests de configuration et de masquage (unitaires), bout en bout inchangés et verts
- **Rapport** : `docs/securite/revue-jalon-5.md`

## Décision

1. **Majorité** : un élève est mineur tant que le pack de son pays ne fixe pas l'âge de la majorité ; la base l'impose.
2. **Jetons d'accord** : jamais rendus à la session de l'élève. Le service de messagerie les émet une fois et les envoie au parent.
3. **Quotas** des appels au modèle pris avant l'appel, en base, par élève, nature et jour ; questions des parents limitées et réservées aux accords actifs ; une demande d'accord aux rapports par jour.
4. **Connexion** : limites d'envoi et d'essais des codes tenues en base, clés pseudonymisées ; seuls les essais faux comptent.
5. **Simulation** seulement sur un poste local, quelle que soit la valeur d'`ENVIRONNEMENT` ; secrets recopiés du modèle refusés ; modèle de configuration en production.
6. **En-têtes de sécurité** sur toutes les pages : pas d'affichage dans un cadre, aucune adresse envoyée à un autre site, sources limitées au site.
7. **Moindre droit** : liste d'opposition, insertion de signalements et état d'accord retirés aux sessions ; Conformité limitée aux prérequis de son référentiel.
8. **Masquage** commun des numéros, emails et liens dans les textes libres conservés ou envoyés au modèle.

## Conséquences

- Les tests se reconnectent souvent : `playwright.config.ts` relève les limites de connexion (valeurs de test).
- La mise en production (étape 2) devra fermer l'API de données de Supabase (D1) et planifier la purge (D3).
