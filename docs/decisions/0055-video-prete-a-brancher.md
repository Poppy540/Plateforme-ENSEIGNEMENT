# 0055 — Vidéo prête à brancher : Cloudflare Stream et passerelle d'avatar

- **Date** : 2026-10-21 · **Statut** : appliqué (Jalon 7, étape 2). **Rien n'est souscrit** ; aucun appel réel n'a été fait.

## Contexte

La chaîne de production vidéo (ADR 0020, 0025) n'existait qu'en simulation. Cloudflare Stream est dans la stack validée (ADR 0011). Le fournisseur d'avatar n'est pas choisi, et les offres du marché ont chacune leur propre API.

## Décision

1. **Services réels** (`src/lib/production-video/fournisseurs.ts`), choisis par `MODE_VIDEO=reel` :
   - **passerelle d'avatar générique** (HTTPS et jeton), avec un contrat court écrit dans le dossier de production §3 bis : vidéo d'un segment (tâche asynchrone), transcription pour le contrôle de fidélité, assemblage des segments.
     - N'importe quel fournisseur s'y branche, directement ou par un petit service qui l'enveloppe : la plateforme ne dépend d'aucune offre.
     - La voix est produite par le fournisseur avec la vidéo.
   - **Cloudflare Stream** :
     - copie de la vidéo assemblée depuis son adresse, attente de la préparation, MP4 de secours activé ;
     - référence `cloudflare-stream://<uid>`, avec un identifiant vérifié (32 caractères hexadécimaux).
2. **Lecture** :
   - HLS adaptatif, avec un plafond de débit selon la version choisie par l'élève : « Économie de données » à environ 300 kbit/s (version par défaut), ou « Automatique » ;
   - MP4 en secours pour les navigateurs sans HLS ;
   - sous-titres toujours servis par la plateforme (fichier WebVTT gardé avec la vidéo) ;
   - le sous-domaine de lecture est vérifié. Sans lui, la vidéo n'est pas proposée.
3. **Garde-fous inchangés**, appliqués par la chaîne quel que soit le fournisseur :
   - script validé et inchangé ;
   - estimation avant dépense et arrêt au budget ;
   - au plus trois tentatives ;
   - contrôle de fidélité par transcription ;
   - version faible débit obligatoire ;
   - aucune personne réelle sans autorisation enregistrée ;
   - vidéo « à relire », publiée seulement par le référent.
4. **Erreurs** : étape, code HTTP et catégorie seulement (configuration, temporaire, refusée, délai) ; jamais un jeton, un texte de script ni une adresse.
5. **Vérification** : `pnpm verifier:production` exige, en mode réel :
   - la passerelle d'avatar en https ;
   - le tarif par minute ;
   - le compte et le jeton Stream ;
   - le sous-domaine de lecture ;
   - le budget par vidéo.
6. **Tests de contrat** sans réseau (faux fournisseur) :
   - requêtes, en-têtes, attente des tâches ;
   - échecs et délais ;
   - refus des adresses non https et des identifiants mal formés ;
   - chaîne complète jusqu'à une vidéo « à relire » hébergée sur Stream.

## Conséquences

- Au branchement, il faut revérifier le format public de l'API Stream et faire écrire, ou fournir, la passerelle du fournisseur d'avatar choisi.
- Les vidéos Stream sont publiques par leur adresse (sans URL signée). C'est acceptable pour des cours publiés ; à revoir si le juriste le demande.
- Le coût d'hébergement est estimé à environ 0,005 USD par minute et par mois ; la diffusion est facturée en plus par Stream. Les deux sont à suivre sur les factures.
