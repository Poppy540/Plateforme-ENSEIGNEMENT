// Fournisseurs d'envoi de messages (Jalon 5, étape 2 ; ADR 0045) : SMS et email, prêts à brancher.
// Aucun fournisseur n'est choisi : chaque adaptateur suit le format public de l'API du fournisseur, à
// revérifier au branchement, et reçoit sa configuration (secrets compris) de l'appelant. Jamais de journal du
// contenu, du destinataire ni d'un secret : les erreurs ne portent qu'un code HTTP et une catégorie.

export type Canal = "sms" | "email";

export interface MessageSortant {
  canal: Canal;
  destinataire: string;
  texte: string;
  /** Objet (email seulement). */
  objet?: string;
}

/** Catégorie d'échec : « refuse » (destinataire ou contenu refusé), « temporaire » (réessayer plus tard), « configuration ». */
export type CategorieEchec = "refuse" | "temporaire" | "configuration";

export type ResultatEnvoi =
  | { ok: true; reference: string | null }
  | { ok: false; categorie: CategorieEchec; statut: number | null };

export interface FournisseurMessages {
  nom: string;
  canaux: Canal[];
  envoyer(message: MessageSortant): Promise<ResultatEnvoi>;
}

export type Fetch = (url: string, init: RequestInit) => Promise<Response>;

const DELAI_MS = 10_000;

function categorie(statut: number): CategorieEchec {
  if (statut === 401 || statut === 403) return "configuration";
  if (statut === 429 || statut >= 500) return "temporaire";
  return "refuse";
}

async function appeler(fetchFn: Fetch, url: string, init: RequestInit): Promise<ResultatEnvoi> {
  let reponse: Response;
  try {
    reponse = await fetchFn(url, { ...init, signal: AbortSignal.timeout(DELAI_MS) });
  } catch {
    return { ok: false, categorie: "temporaire", statut: null };
  }
  if (!reponse.ok)
    return { ok: false, categorie: categorie(reponse.status), statut: reponse.status };
  const corps = (await reponse.json().catch(() => null)) as Record<string, unknown> | null;
  const reference = corps?.sid ?? corps?.messageId ?? corps?.reference ?? corps?.id ?? null;
  return { ok: true, reference: typeof reference === "string" ? reference : null };
}

function verifierCanal(f: FournisseurMessages, m: MessageSortant): ResultatEnvoi | null {
  return f.canaux.includes(m.canal)
    ? null
    : { ok: false, categorie: "configuration", statut: null };
}

/** SMS par Twilio (API « Messages », formulaire encodé, authentification Basic compte:jeton). */
export function fournisseurTwilio(
  config: { compte: string; jeton: string; expediteur: string },
  fetchFn: Fetch = fetch,
): FournisseurMessages {
  const f: FournisseurMessages = {
    nom: "twilio",
    canaux: ["sms"],
    async envoyer(m) {
      const refus = verifierCanal(f, m);
      if (refus) return refus;
      const corps = new URLSearchParams({
        To: m.destinataire,
        From: config.expediteur,
        Body: m.texte,
      });
      return appeler(
        fetchFn,
        `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.compte)}/Messages.json`,
        {
          method: "POST",
          headers: {
            authorization: `Basic ${Buffer.from(`${config.compte}:${config.jeton}`).toString("base64")}`,
            "content-type": "application/x-www-form-urlencoded",
          },
          body: corps.toString(),
        },
      );
    },
  };
  return f;
}

/** Email transactionnel par Brevo (API « smtp/email », JSON, clé dans l'en-tête api-key). */
export function fournisseurBrevo(
  config: { cle: string; expediteur: string; nomExpediteur: string },
  fetchFn: Fetch = fetch,
): FournisseurMessages {
  const f: FournisseurMessages = {
    nom: "brevo",
    canaux: ["email"],
    async envoyer(m) {
      const refus = verifierCanal(f, m);
      if (refus) return refus;
      return appeler(fetchFn, "https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": config.cle,
          "content-type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          sender: { name: config.nomExpediteur, email: config.expediteur },
          to: [{ email: m.destinataire }],
          subject: m.objet ?? config.nomExpediteur,
          textContent: m.texte,
        }),
      });
    },
  };
  return f;
}

/**
 * Passerelle HTTP générique (agrégateur SMS local, relais email) : JSON { canal, destinataire, objet, texte },
 * jeton Bearer. L'adresse doit être en https.
 */
export function fournisseurHttp(
  config: { url: string; jeton: string; canaux: Canal[] },
  fetchFn: Fetch = fetch,
): FournisseurMessages {
  if (!/^https:\/\//.test(config.url))
    throw new Error("La passerelle de messagerie doit être en https.");
  const f: FournisseurMessages = {
    nom: "http",
    canaux: config.canaux,
    async envoyer(m) {
      const refus = verifierCanal(f, m);
      if (refus) return refus;
      return appeler(fetchFn, config.url, {
        method: "POST",
        headers: { authorization: `Bearer ${config.jeton}`, "content-type": "application/json" },
        body: JSON.stringify({
          canal: m.canal,
          destinataire: m.destinataire,
          objet: m.objet ?? null,
          texte: m.texte,
        }),
      });
    },
  };
  return f;
}

/** Canal d'un destinataire : une adresse email, sinon un numéro de téléphone. */
export function canalDe(destinataire: string): Canal {
  return destinataire.includes("@") ? "email" : "sms";
}
