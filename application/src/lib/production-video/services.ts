// Services externes de la chaîne de production vidéo (ADR 0020, 0025). Les fournisseurs réels (voix,
// avatar, transcription, hébergement) ne sont pas encore choisis : seule l'implémentation simulée existe.
// Les clés éventuelles sont lues par chaque implémentation dans l'environnement, jamais journalisées.

export interface FicheAvatar {
  /** Identifiants chez le fournisseur (avatar du catalogue, voix de synthèse). */
  avatar: string;
  voix: string;
  langue: string;
  description: string;
  /** Une personne réelle est-elle représentée ? Si oui, autorisations enregistrées obligatoires. */
  personne_reelle: boolean;
  autorisation_voix: string | null;
  autorisation_visage: string | null;
}

export interface ResultatVoix {
  /** Indice du segment dans le script (0, 1, …). */
  segment: number;
  audio: string;
  dureeSecondes: number;
  coutUSD: number;
}

export interface ResultatAvatar {
  segment: number;
  video: string;
  dureeSecondes: number;
  coutUSD: number;
}

export interface VersionHebergee {
  qualite: string;
  debitKbps: number;
}

export interface ResultatDepot {
  reference: string;
  versions: VersionHebergee[];
  coutUSD: number;
}

export interface ServicesVideo {
  nom: string;
  /** Estimation du coût d'un segment avant toute dépense (contrôle du budget). */
  estimerSegment(texte: string): number;
  voix(segment: number, texte: string, fiche: FicheAvatar): Promise<ResultatVoix>;
  avatar(audio: ResultatVoix, fiche: FicheAvatar, indications: string): Promise<ResultatAvatar>;
  /** Transcription de la vidéo produite, pour le contrôle de fidélité. */
  transcrire(video: ResultatAvatar): Promise<{ texte: string; coutUSD: number }>;
  /** Assemble les segments, ajoute les sous-titres, produit les versions (dont faible débit) et dépose. */
  deposer(segments: ResultatAvatar[], sousTitresVtt: string): Promise<ResultatDepot>;
}
