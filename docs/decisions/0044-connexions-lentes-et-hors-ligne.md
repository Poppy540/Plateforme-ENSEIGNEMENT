# 0044 — Connexions lentes et hors ligne

- **Date** : 2026-10-21 · **Statut** : technique, conforme au plan du Jalon 5 (ADR 0042 : « lecture et file »)
- **Tests** : `hors-ligne.spec.ts`, `poids-pages.spec.ts` (bout en bout)

## Décision

1. **Service worker écrit à la main** (`public/sw.js`), sans paquet tiers (Serwist, cité par la documentation de Next.js, aurait demandé votre accord). Il n'est enregistré que sur une version compilée pour la production.
2. **Ce qui est gardé sur l'appareil** :
   - les fichiers statiques de Next.js, dont le nom porte une empreinte ;
   - la page « Pas de connexion » ;
   - les pages de chapitre déjà ouvertes (réseau d'abord, copie ensuite).

   Rien d'autre : ni vidéos, ni quiz, ni API, ni autres pages.
3. **Cloisonnement par personne** : les copies portent une clé de session, pseudonyme salé calculé par le serveur et jamais l'identifiant. Quand la clé change (autre personne sur le même téléphone), quand on se déconnecte ou quand on arrive sur la page de connexion, toutes les copies et les questions en attente sont effacées.
3 bis. **Copies dans l'ordre** : deux chargements d'une même page peuvent finir dans le désordre sur réseau lent ; une copie plus ancienne ne remplace jamais une copie plus récente (date de la demande gardée avec la copie).
4. **Questions sans réseau** : gardées sur l'appareil (5 au plus par chapitre, pour cette session seulement), affichées « en attente », envoyées dans l'ordre au retour du réseau. Le quota du Professeur s'applique normalement.
5. **Liens vers les chapitres** en navigation classique (page complète), pour que la page soit gardée. Champ et bouton de question désactivés tant que la page n'est pas interactive : sur réseau lent, une saisie faite avant serait perdue.
6. **Budget de poids** : 200 Ko transférés au premier chargement par page (mesure : 145 à 150 Ko pour l'accueil, la connexion, l'aide, le catalogue et un chapitre ; vidéo exclue). La page de connexion doit être utilisable en moins de 20 s sur un réseau lent simulé (250 kbit/s, 600 ms) ; mesure : environ 6 s.

## Limites

- Les vidéos ne sont pas lisibles hors ligne (trop lourdes ; un téléchargement volontaire pourrait venir avec le fournisseur vidéo).
- Une page de chapitre gardée montre l'état au moment de la dernière visite.
- Dans les tests, le mode hors ligne du navigateur ne coupe pas le service worker : la coupure est simulée en refusant aussi ses requêtes.
