# Fournisseurs du pilote : comparatif chiffré (octobre 2026)

**Statut** : document de travail pour la décision 3 du plan du Jalon 2. **Rien n'est souscrit, aucun compte n'est créé.**

**Fiabilité** : les sites des fournisseurs étaient bloqués par le réseau de l'environnement. Les chiffres viennent de recherches limitées aux domaines officiels (2026-10-04), sous forme d'extraits. **Ils sont à revérifier sur les pages citées avant tout engagement.** La qualité du français (voix, synchronisation des lèvres) n'a pas été écoutée.

## 1. Avatar vidéo IA (avatar synthétique du catalogue, aucune personne réelle)

| Fournisseur | Prix relevé | API | Conditions d'usage |
|---|---|---|---|
| HeyGen | API à l'usage, sans abonnement. Avatar III : 0,99 $/min ; Avatar IV : 4,83 $/min ; jumeau numérique : 7,20 $/min. | Oui | Avatars de stock autorisés en usage commercial. Plateforme réservée aux utilisateurs de 18 ans et plus. Avatars représentant des mineurs interdits. Visage réel seulement avec consentement explicite. |
| Synthesia | Starter 29 $/mois (environ 150 min/an) ; Creator 64 $/mois en annuel (environ 720 min/an) | Oui, prise sur le quota | Usage éducatif autorisé si neutre et factuel. Plateforme réservée aux 16 ans et plus. Données supprimées à la fin de l'abonnement. |
| D-ID | Non trouvé (facturation par tranches de 15 s) | Oui | Non vérifié |
| Colossyan | Professional 59 $/mois (environ 40 min) ; offre gratuite de 20 min/mois | Oui (Professional) | Non vérifié |

## 2. Voix française (si l'outil d'avatar accepte un fichier audio)

Hypothèse : un script de 10 minutes compte environ 8 500 caractères.

| Fournisseur | Prix relevé | Offre gratuite mensuelle | Coût d'un script |
|---|---|---|---|
| Azure AI Speech | Neural : 16 $ par million de caractères | 0,5 million de caractères | 0,14 $, soit environ 58 scripts gratuits par mois |
| Google Cloud TTS | Neural2 : 16 $ par million ; Chirp 3 HD : 30 $ par million | 1 million de caractères | 0,03 à 0,26 $ |
| Amazon Polly | Neural : 16 $ par million ; génératif : 30 $ par million | Non vérifiée | 0,14 à 0,26 $ |
| ElevenLabs | 0,05 à 0,10 $ pour 1 000 caractères | Non trouvée | 0,43 à 0,85 $ |

À vérifier : les accents disponibles et les droits d'usage commercial. Chez HeyGen, la voix est comprise dans le prix de l'avatar.

## 3. Hébergement et diffusion vidéo

| Fournisseur | Prix relevé | Faible débit et hors ligne |
|---|---|---|
| Cloudflare Stream | Stockage : 5 $ pour 1 000 min. Diffusion : 1 $ pour 1 000 min. | Débit adaptatif. MP4 téléchargeable. |
| Bunny Stream | Stockage dès 0,01 $/Go. Diffusion vers l'Afrique : 0,06 $/Go. Encodage gratuit. | MP4 téléchargeable. |
| Mux | 100 000 min de diffusion gratuites par mois, mais offre gratuite limitée à 10 vidéos. | MP4 téléchargeable. |

À vérifier chez chacun : peut-on imposer une qualité de 240p ou 360p par défaut ?

## 4. SMS de connexion vers le Gabon

| Fournisseur | Prix relevé | Remarques |
|---|---|---|
| Twilio | 0,3146 $ par SMS | Intégré à Supabase. Émetteur alphanumérique sans enregistrement préalable. |
| Vonage, Bird | Non trouvé | Intégrés à Supabase |
| Africa's Talking | — | Le Gabon n'est pas couvert. |

Un agrégateur local reste possible via le crochet « Send SMS » de Supabase. Des tarifs de 0,04 à 0,18 € par SMS sont annoncés par des sources non officielles, non vérifiées.

## 5. Hébergement de l'application

| Hébergeur | Prix relevé | Remarque |
|---|---|---|
| Cloudflare Workers | Gratuit jusqu'à 100 000 requêtes par jour, puis 5 $/mois | Next.js passe par un adaptateur (OpenNext), à tester |
| Vercel | Pro : 20 $/mois | L'offre gratuite Hobby est **non commerciale** : exclue |
| Netlify | Crédits gratuits limités | Le site est mis en pause au-delà |

## Ordres de grandeur pour le pilote

Ce sont des estimations ; les chiffres sont à revérifier.

| Poste | Estimation |
|---|---|
| Une vidéo de 10 min avec HeyGen Avatar III | environ 10 $ |
| Une vidéo de 10 min avec HeyGen Avatar IV | environ 48 $ |
| Voix séparée | 0 $ (offre gratuite Azure ou Google) à 0,85 $ |
| Diffusion de 10 000 min par mois (100 élèves × 10 vidéos) sur Cloudflare | environ 15 $/mois |
| Diffusion de 10 000 min par mois sur Bunny | environ 2 $/mois |
| **1 000 SMS de connexion avec Twilio** | **environ 315 $, le poste le plus cher** |

## Proposition de Claude Code (à décider par le propriétaire)

1. **Avatar : HeyGen par API**, avec un avatar de stock en Avatar III pour la vidéo pilote (environ 10 $). On compare ensuite avec un extrait en Avatar IV. Avant cela, il faut écouter le français.
2. **Voix :** celle comprise dans HeyGen. Plan B : Azure ou Google Neural, dont l'offre gratuite couvre le pilote.
3. **Vidéo : garder Cloudflare Stream** (ADR 0011). Bunny est le plan B le moins cher.
4. **SMS : réduire leur nombre** avant de choisir un fournisseur. Pistes : code par email quand c'est possible, sessions longues, Twilio au démarrage puis un agrégateur local. Le budget SMS est à fixer.
5. **Application : Cloudflare Workers** (gratuit au départ), sous réserve d'un essai de l'adaptateur. Vercel Pro (20 $/mois) est l'alternative la plus simple.

## Points juridiques (pour le juriste au Gabon)

- **Âge :** HeyGen et Synthesia excluent les mineurs comme *utilisateurs*. Seule l'équipe adulte utilisera l'outil. Il faut confirmer par écrit que des élèves mineurs peuvent être le *public* des vidéos.
- **Transferts de données hors du Gabon :**
  - numéros de téléphone vers Twilio et Supabase ;
  - journaux de lecture vers Cloudflare.
  Il faut vérifier la loi gabonaise et le rôle de la CNPDCP.
- **Contrats de sous-traitance (DPA)** avec chaque fournisseur : lieu de stockage et durée de conservation.
- **SMS applicatifs :** vérifier la réglementation de l'ARCEP Gabon.
- **Avatars et transparence :**
  - aucune ressemblance avec une personne réelle ;
  - aucun clonage de voix ou de visage ;
  - le professeur est présenté comme une IA.

## Sources (consultées le 2026-10-04)

**Avatar vidéo**
- HeyGen :
  - <https://help.heygen.com/en/articles/10060327-heygen-api-pricing-explained>
  - <https://www.heygen.com/api-pricing>
  - <https://www.heygen.com/moderation-policy>
  - <https://www.heygen.com/terms>
- Synthesia :
  - <https://www.synthesia.io/pricing>
  - <https://www.synthesia.io/legal/acceptable-use-policy>
- D-ID : <https://help.d-id.com/hc/en-us/articles/31234293852433>
- Colossyan : <https://www.colossyan.com/pricing/>

**Voix**
- ElevenLabs : <https://elevenlabs.io/pricing/api>
- Azure AI Speech : <https://azure.microsoft.com/en-us/pricing/details/speech/>
- Google Cloud TTS : <https://cloud.google.com/text-to-speech/pricing>
- Amazon Polly : <https://aws.amazon.com/polly/pricing/>

**Hébergement vidéo**
- Cloudflare Stream :
  - <https://community.cloudflare.com/t/stream-fees/568244> (forum, car la page officielle des prix était bloquée)
  - <https://developers.cloudflare.com/stream/viewing-videos/download-videos/>
- Bunny Stream : <https://bunny.net/pricing/stream/>
- Mux : <https://www.mux.com/pricing>

**SMS**
- Twilio :
  - <https://www.twilio.com/en-us/sms/pricing/ga>
  - <https://www.twilio.com/en-us/guidelines/ga/sms>
- Supabase : <https://supabase.com/docs/guides/auth/phone-login>
- Africa's Talking : <https://help.africastalking.com/en/articles/2727792>

**Hébergement de l'application**
- Vercel :
  - <https://vercel.com/docs/plans/hobby>
  - <https://vercel.com/pricing>
- Cloudflare Workers : <https://developers.cloudflare.com/workers/platform/pricing/>
