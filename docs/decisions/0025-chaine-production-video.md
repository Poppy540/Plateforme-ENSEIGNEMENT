# 0025 — Chaîne de production vidéo : mise en œuvre avec services simulés

- **Date** : 2026-10-04 · **Statut** : technique, conforme à l'ADR 0020 (chaîne programmée validée) et au prompt C2 · fournisseurs non choisis : **services simulés** seulement

## Décision

1. **Interfaces de services** (`application/src/lib/production-video/services.ts`) : voix, avatar, transcription (contrôle de fidélité), dépôt (assemblage, sous-titres, versions dont faible débit), estimation du coût d'un segment. Une seule implémentation pour l'instant : **simulée** (`MODE_VIDEO=simulation`, interdite hors développement et test), avec pannes injectables pour les tests. Sans fournisseur, la production réelle est indisponible et le dit.
2. **Étapes** (`chaine.ts`), chacune tracée dans le rapport :
   1. vérification du script : statut validé, empreinte recalculée par la base = empreinte enregistrée = empreinte validée, version validée = version, et version/empreinte relues par le demandeur ;
   2. droits voix et visage : avatar et voix synthétiques, ou personne réelle avec deux autorisations enregistrées et actives ;
   3. découpage : un segment par section, texte repris **tel quel** ;
   4. budget : coût estimé ≤ budget avant toute dépense, puis contrôle après chaque appel payant ; arrêt et alerte au premier dépassement ;
   5. par segment : voix → avatar → transcription → fidélité (taux d'erreur par mot ≤ 5 %) ; **3 tentatives au plus** (panne ou écart), puis arrêt et alerte ;
   6. sous-titres WebVTT français tirés du **texte validé** (jamais de la transcription), vérifiés identiques au script ;
   7. contrôle technique : durée à ±25 % de la cible (anomalie signalée au référent sinon) ; synchronisation, volume et lisibilité marqués « à vérifier à la relecture » tant qu'aucun fournisseur ne les mesure ;
   8. dépôt : une version faible débit (≤ 500 kbit/s) est obligatoire.
3. **Résultat** : « déposée » (vidéo enregistrée « à relire », statut imposé par la base qui revérifie le script), « arrêtée » (après dépense : budget, échecs, fidélité) ou « refusée » (avant toute dépense). Toute production est consignée dans `journal_production_video` avec son coût ; chaque alerte crée un signalement pour un humain. **Aucune publication** : c'est l'étape 6, acte humain distinct.
4. **Lancement** : par un enseignant-référent de la famille, depuis la page d'un script validé, pour la version et l'empreinte qu'il a sous les yeux. Production synchrone pour l'instant (rapide en simulation) ; avec de vrais fournisseurs (plusieurs minutes), elle passera par une file de tâches (Orchestrateur).
5. **Fiche de l'avatar** dans le pack pays (`referentiels/<pays>/agents/production-video/<unité>.yaml`) ; celle de l'unité pilote est provisoire : avatar et voix synthétiques à choisir chez le fournisseur.
6. **Budget par vidéo** : `BUDGET_VIDEO_USD`, décision du propriétaire ; obligatoire hors simulation (15 USD par défaut en simulation uniquement).

## Reste à faire avec de vrais fournisseurs

Implémenter `ServicesVideo` pour les fournisseurs retenus (clés dans `secrets/production-video.env`, jamais journalisées), mesurer synchronisation et volume, tarifs réels dans l'estimation, file de tâches pour les productions longues.
