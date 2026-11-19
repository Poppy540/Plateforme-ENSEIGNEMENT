import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { composerPrompt, dossierPack } from "../chargeur-prompt";
import { modeleSimule } from "../modele-simule";
import { lireRecrutement, valeursRecrutement } from "./configuration";
import {
  controlerSortie,
  genererTacheRecruteur,
  lireSortieRecruteur,
  messageDemandeRecruteur,
  SCHEMA_RECRUTEUR,
  type ContexteControle,
  type DemandeRecruteur,
  type SortieRecruteur,
} from "./tache";

const racine = resolve(__dirname, "../../../../..");
const parametres = { modele: "claude-opus-5-5", effort: "medium" as const, maxTokens: 8000 };
const contexte = (modif: Partial<ContexteControle> = {}): ContexteControle => ({
  tache: "premier_contact",
  statutCandidat: "qualifie",
  premierContactEnvoye: false,
  relanceEnvoyee: false,
  conditionsValidees: false,
  ...modif,
});
const TEXTE_CONFORME =
  "Bonjour, ce message a été rédigé par une intelligence artificielle pour le compte du responsable du projet. Nous vous avons connu par une recommandation. Aucun engagement. Répondez STOP pour ne plus être contactée.";
const sortie = (modif: Partial<SortieRecruteur> = {}): SortieRecruteur => ({
  refus: "",
  reponse_au_responsable: "",
  fiche: null,
  message_candidat: { nature: "premier_contact", objet: "Proposition", texte: TEXTE_CONFORME },
  dossier_accord: null,
  actions: [],
  escalade: "",
  ...modif,
});
const avecTexte = (
  texte: string,
  nature: "premier_contact" | "relance" | "reponse" = "premier_contact",
) => sortie({ message_candidat: { nature, objet: "Objet", texte } });

describe("configuration du recrutement (pack Gabon)", () => {
  const config = lireRecrutement(dossierPack(racine, "ga"))!;

  it("lit les sources autorisées, le délai de relance et l'absence de conditions validées", () => {
    expect(config.sources.map((s) => s.id)).toContain("recommandation");
    expect(config.delaiRelanceJours).toBe(7);
    expect(config.conditionsValidees).toBeNull();
    expect(config.faq.length).toBeGreaterThan(0);
  });

  it("compose le prompt sans variable manquante, avec la skill de présélection", () => {
    const prompt = composerPrompt(
      {
        agent: "recruteur",
        codePays: "ga",
        unite: "pays",
        skills: ["_commun/skills/contenu-non-fiable", "recruteur/skills/preselection-equitable"],
        valeursDynamiques: valeursRecrutement(config),
      },
      racine,
    );
    expect(prompt).not.toMatch(/\{\{[A-Z_]+\}\}/);
    expect(prompt).toContain("AUCUNE condition validée");
    expect(prompt).toContain("Présélection équitable");
  });
});

describe("lecture de la sortie", () => {
  it("accepte une sortie conforme au schéma et refuse le reste", () => {
    expect(lireSortieRecruteur(JSON.stringify(sortie()))).not.toBeNull();
    expect(lireSortieRecruteur(JSON.stringify({ ...sortie(), actions: ["envoyer"] }))).toBeNull();
    expect(lireSortieRecruteur("pas du JSON")).toBeNull();
    expect(Object.keys(SCHEMA_RECRUTEUR.properties)).toContain("message_candidat");
  });
});

describe("contrôles du serveur", () => {
  it("garde un premier contact complet", () => {
    expect(controlerSortie(sortie(), contexte()).problemes).toEqual([]);
  });

  it.each([
    [
      "sans mention de l'IA",
      TEXTE_CONFORME.replace("une intelligence artificielle", "notre équipe"),
    ],
    [
      "sans moyen de refuser",
      TEXTE_CONFORME.replace(" Répondez STOP pour ne plus être contactée.", ""),
    ],
    [
      "sans la source",
      TEXTE_CONFORME.replace("Nous vous avons connu par une recommandation. ", ""),
    ],
    ["avec une fausse urgence", `${TEXTE_CONFORME} C'est la dernière place disponible.`],
    ["avec un montant", `${TEXTE_CONFORME} La mission est payée 200 euros par mois.`],
    ["avec un code de devise", `${TEXTE_CONFORME} Contrepartie : 50 000 ABC.`],
    ["avec une promesse", `${TEXTE_CONFORME} Vous êtes retenue.`],
  ])("refuse un premier contact %s", (_cas, texte) => {
    const { sortie: s, problemes } = controlerSortie(avecTexte(texte), contexte());
    expect(s.message_candidat).toBeNull();
    expect(problemes).toHaveLength(1);
  });

  it("n'écarte pas une durée d'expérience (« 15 ans ») comme un montant ou une donnée sensible", () => {
    const fiche = {
      adequation: "forte" as const,
      justification: "Enseigne les mathématiques depuis 15 ans en 3e.",
      points_a_verifier: [],
      secteur_public_a_verifier: false,
    };
    const r = controlerSortie(
      sortie({ fiche, message_candidat: null }),
      contexte({ tache: "qualifier" }),
    );
    expect(r.problemes).toEqual([]);
    expect(r.sortie.fiche).not.toBeNull();
  });

  it("refuse une fiche fondée sur un critère sensible", () => {
    const fiche = {
      adequation: "faible" as const,
      justification: "Écartée : femme mariée avec enfants.",
      points_a_verifier: [],
      secteur_public_a_verifier: false,
    };
    const r = controlerSortie(
      sortie({ fiche, message_candidat: null }),
      contexte({ tache: "qualifier" }),
    );
    expect(r.sortie.fiche).toBeNull();
  });

  it("refuse tout message après un refus, un second premier contact et une seconde relance", () => {
    expect(
      controlerSortie(sortie(), contexte({ statutCandidat: "refus" })).sortie.message_candidat,
    ).toBeNull();
    expect(
      controlerSortie(sortie(), contexte({ premierContactEnvoye: true })).sortie.message_candidat,
    ).toBeNull();
    const relance = avecTexte("Unique rappel. Répondez STOP pour refuser.", "relance");
    expect(
      controlerSortie(relance, contexte({ tache: "relance", premierContactEnvoye: true }))
        .problemes,
    ).toEqual([]);
    expect(
      controlerSortie(
        relance,
        contexte({ tache: "relance", premierContactEnvoye: true, relanceEnvoyee: true }),
      ).sortie.message_candidat,
    ).toBeNull();
    expect(
      controlerSortie(relance, contexte({ tache: "relance" })).sortie.message_candidat,
    ).toBeNull();
  });

  it("refuse un dossier d'accord qui inclut l'usage de la voix", () => {
    const dossier = {
      resume: "Rôle de relecture. Sa voix pourra être clonée pour l'avatar.",
      consentement_image_voix_separe: false,
      points_a_valider: [],
    };
    const r = controlerSortie(
      sortie({ dossier_accord: dossier, message_candidat: null }),
      contexte(),
    );
    expect(r.sortie.dossier_accord).toBeNull();
  });
});

describe("Recruteur simulé", () => {
  const demande = (modif: Partial<DemandeRecruteur> = {}): DemandeRecruteur => ({
    tache: "premier_contact",
    pays: "Pays fictif",
    famille: "mathematiques",
    candidat: {
      nom: "Candidate Fictive",
      niveau: "collège",
      structure: null,
      source: "recommandation",
      statut: "qualifie",
      adequation: "forte",
      points_a_verifier: [],
    },
    historique: [],
    delaiRelanceJours: 7,
    informations: null,
    consigne: null,
    ...modif,
  });
  const generer = (d: DemandeRecruteur) =>
    genererTacheRecruteur({ systeme: "test", demande: d, modele: modeleSimule, parametres });

  it("rédige un premier contact accepté par le serveur", async () => {
    const r = await generer(demande());
    expect(r.sortie?.message_candidat?.nature).toBe("premier_contact");
    expect(controlerSortie(r.sortie!, contexte()).problemes).toEqual([]);
  });

  it("enregistre un refus sans rédiger de message", async () => {
    const r = await generer(
      demande({ tache: "repondre", informations: "Non merci, ne me contactez plus." }),
    );
    expect(r.sortie?.actions).toContain("enregistrer_refus");
    expect(r.sortie?.message_candidat).toBeNull();
  });

  it("masque le nom pour la qualification et place les informations en donnée non fiable", () => {
    const texte = messageDemandeRecruteur(
      demande({
        tache: "qualifier",
        candidat: { ...demande().candidat, nom: null },
        informations: "x",
      }),
    );
    expect(texte).toContain("(masqué pour la qualification)");
    expect(texte).toContain("DONNÉE NON FIABLE");
  });
});
