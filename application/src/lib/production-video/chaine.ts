// Chaîne de production vidéo (ADR 0020, 0025) : applique les règles du prompt C2, de façon déterministe.
// Elle ne modifie jamais le texte du script, ne publie jamais, s'arrête et alerte au lieu de dépasser le
// budget ou de boucler. Elle ne touche pas à la base : l'appelant fournit le script vérifié et enregistre
// la vidéo (statut « à relire » imposé par la base) et le journal.
import type { SortieScenariste } from "../agents/scenariste/script.ts";
import { ecart, SEUIL_ECART } from "./fidelite.ts";
import type { FicheAvatar, ResultatAvatar, ServicesVideo, VersionHebergee } from "./services.ts";
import { sousTitresVtt, texteDesSousTitres } from "./sous-titres.ts";

export const TENTATIVES_MAX = 3;
/** Une version faible débit est obligatoire (connexions lentes) : au plus ce débit. */
export const DEBIT_FAIBLE_MAX_KBPS = 500;

export interface ScriptPourProduction {
  id: string;
  statut: string;
  version: number;
  empreinte: string;
  /** Empreinte recalculée par la base sur le contenu actuel. */
  empreinteRecalculee: string;
  /** Version et empreinte de la dernière validation tracée (null si jamais validé). */
  versionValidee: number | null;
  empreinteValidee: string | null;
  dureeCibleMinutes: number;
  contenu: SortieScenariste;
}

export interface DemandeProduction {
  script: ScriptPourProduction;
  /** Version et empreinte relues par le demandeur (ce qu'il croit faire produire). */
  versionDemandee: number;
  empreinteDemandee: string;
  fiche: FicheAvatar;
  budgetUSD: number;
  services: ServicesVideo;
  autorisationActive: (id: string, usage: "voix" | "visage") => Promise<boolean>;
}

type StatutEtape = "ok" | "echec" | "non_fait";
export type ResultatProduction = "deposee" | "arretee" | "refusee";

export interface RapportProduction {
  script: { id: string; version: number; empreinte: string };
  resultat: ResultatProduction;
  services: string;
  etapes: { etape: string; statut: StatutEtape; detail: string }[];
  segments: { numero: number; tentatives: number; dureeSecondes: number; ecart: number }[];
  dureeSecondes: number;
  dureeCibleSecondes: number;
  controles: { controle: string; resultat: "ok" | "anomalie" | "non_verifiable"; detail: string }[];
  fichiers: { reference: string; versions: VersionHebergee[] } | null;
  sousTitresVtt: string | null;
  coutUSD: number;
  budgetUSD: number;
  anomalies: string[];
  /** Alertes pour un humain (budget, échecs répétés, fidélité, droits). */
  escalades: string[];
}

class Arret extends Error {
  constructor(
    readonly resultat: "arretee" | "refusee",
    readonly escalade: string | null,
    message: string,
  ) {
    super(message);
  }
}

const ETAPES = [
  "verification_script",
  "droits_voix_image",
  "decoupage",
  "budget",
  "voix_avatar_transcription",
  "sous_titres",
  "controle_technique",
  "controle_fidelite",
  "depot_a_relire",
];

export async function produireVideo(d: DemandeProduction): Promise<RapportProduction> {
  const s = d.script;
  const rapport: RapportProduction = {
    script: { id: s.id, version: s.version, empreinte: s.empreinte },
    resultat: "arretee",
    services: d.services.nom,
    etapes: ETAPES.map((etape) => ({ etape, statut: "non_fait", detail: "" })),
    segments: [],
    dureeSecondes: 0,
    dureeCibleSecondes: s.dureeCibleMinutes * 60,
    controles: [],
    fichiers: null,
    sousTitresVtt: null,
    coutUSD: 0,
    budgetUSD: d.budgetUSD,
    anomalies: [],
    escalades: [],
  };
  const etape = (nom: string, statut: StatutEtape, detail = "") => {
    const e = rapport.etapes.find((x) => x.etape === nom)!;
    e.statut = statut;
    e.detail = detail;
  };
  const depenser = (cout: number) => {
    rapport.coutUSD = Math.round((rapport.coutUSD + cout) * 10000) / 10000;
    if (rapport.coutUSD > d.budgetUSD)
      throw new Arret(
        "arretee",
        `Budget dépassé : ${rapport.coutUSD.toFixed(2)} USD dépensés pour ${d.budgetUSD.toFixed(2)} USD alloués.`,
        "Dépassement du budget alloué : production arrêtée.",
      );
  };

  try {
    // 1. Statut, version et empreinte : script validé, inchangé depuis la validation, celui que l'on croit.
    if (s.statut !== "valide" || s.versionValidee === null)
      throw new Arret("refusee", null, "Script non validé : production refusée.");
    if (
      s.empreinteRecalculee !== s.empreinte ||
      s.empreinteValidee !== s.empreinte ||
      s.versionValidee !== s.version
    )
      throw new Arret(
        "refusee",
        "Écart entre le script et sa version validée (empreinte différente) : production refusée.",
        "Script modifié après sa validation : production refusée.",
      );
    if (d.versionDemandee !== s.version || d.empreinteDemandee !== s.empreinte)
      throw new Arret(
        "refusee",
        null,
        "La version demandée n'est pas la version validée actuelle : relisez le script.",
      );
    etape(
      "verification_script",
      "ok",
      `version ${s.version}, empreinte ${s.empreinte.slice(0, 12)}`,
    );

    // 2. Voix et visage : synthétiques, ou personne réelle avec autorisations enregistrées et actives.
    if (d.fiche.personne_reelle) {
      const voix = d.fiche.autorisation_voix
        ? await d.autorisationActive(d.fiche.autorisation_voix, "voix")
        : false;
      const visage = d.fiche.autorisation_visage
        ? await d.autorisationActive(d.fiche.autorisation_visage, "visage")
        : false;
      if (!voix || !visage)
        throw new Arret(
          "refusee",
          "Voix ou visage d'une personne réelle sans autorisation écrite enregistrée et active.",
          "Autorisation écrite manquante pour la voix ou le visage : production refusée.",
        );
    }
    etape(
      "droits_voix_image",
      "ok",
      d.fiche.personne_reelle
        ? "autorisations enregistrées et actives"
        : "avatar et voix synthétiques",
    );

    // 3. Découpage : un segment par section, texte repris tel quel.
    const segments = s.contenu.sections.map((x, i) => ({
      numero: i,
      texte: x.texte_parle,
      indications: x.indications_visuelles,
    }));
    if (segments.length === 0 || segments.some((x) => !x.texte.trim()))
      throw new Arret("refusee", null, "Script sans texte parlé exploitable.");
    etape("decoupage", "ok", `${segments.length} segments`);

    // 4. Budget estimé avant toute dépense.
    const estimation = segments.reduce((t, x) => t + d.services.estimerSegment(x.texte), 0);
    if (estimation > d.budgetUSD)
      throw new Arret(
        "refusee",
        `Coût estimé ${estimation.toFixed(2)} USD supérieur au budget alloué (${d.budgetUSD.toFixed(2)} USD).`,
        "Budget insuffisant : production non lancée.",
      );
    etape(
      "budget",
      "ok",
      `estimation ${estimation.toFixed(2)} USD pour ${d.budgetUSD.toFixed(2)} USD`,
    );

    // 5-7. Par segment : voix, avatar, transcription et fidélité ; 3 tentatives au plus, puis escalade.
    const produits: ResultatAvatar[] = [];
    for (const seg of segments) {
      let dernierProbleme = "";
      let reussi: { video: ResultatAvatar; ecart: number; tentatives: number } | null = null;
      for (let tentative = 1; tentative <= TENTATIVES_MAX && !reussi; tentative++) {
        try {
          const voix = await d.services.voix(seg.numero, seg.texte, d.fiche);
          depenser(voix.coutUSD);
          const video = await d.services.avatar(voix, d.fiche, seg.indications);
          depenser(video.coutUSD);
          const transcription = await d.services.transcrire(video);
          depenser(transcription.coutUSD);
          const e = ecart(seg.texte, transcription.texte);
          if (e <= SEUIL_ECART) reussi = { video, ecart: e, tentatives: tentative };
          else {
            dernierProbleme = `écart de fidélité ${(e * 100).toFixed(0)} %`;
            rapport.anomalies.push(
              `Segment ${seg.numero + 1}, tentative ${tentative} : ${dernierProbleme}, segment régénéré.`,
            );
          }
        } catch (erreur) {
          if (erreur instanceof Arret) throw erreur;
          dernierProbleme = `échec d'un service (${(erreur as Error).message})`;
          rapport.anomalies.push(
            `Segment ${seg.numero + 1}, tentative ${tentative} : ${dernierProbleme}.`,
          );
        }
      }
      if (!reussi)
        throw new Arret(
          "arretee",
          `Segment ${seg.numero + 1} : ${dernierProbleme} après ${TENTATIVES_MAX} tentatives.`,
          `Échec persistant sur le segment ${seg.numero + 1} : production arrêtée.`,
        );
      produits.push(reussi.video);
      rapport.segments.push({
        numero: seg.numero + 1,
        tentatives: reussi.tentatives,
        dureeSecondes: reussi.video.dureeSecondes,
        ecart: reussi.ecart,
      });
    }
    etape("voix_avatar_transcription", "ok", `${produits.length} segments produits`);

    // Sous-titres depuis le texte validé, à l'identique.
    const vtt = sousTitresVtt(
      segments.map((x, i) => ({ texte: x.texte, dureeSecondes: produits[i].dureeSecondes })),
    );
    if (ecart(segments.map((x) => x.texte).join(" "), texteDesSousTitres(vtt)) !== 0)
      throw new Arret(
        "arretee",
        "Sous-titres différents du texte validé.",
        "Sous-titres non conformes.",
      );
    rapport.sousTitresVtt = vtt;
    etape("sous_titres", "ok", "WebVTT, français, depuis le texte validé");

    // Contrôle technique : durée par rapport à la cible (±25 %) ; le reste dépend du fournisseur.
    rapport.dureeSecondes = produits.reduce((t, x) => t + x.dureeSecondes, 0);
    const ecartDuree = Math.abs(rapport.dureeSecondes - rapport.dureeCibleSecondes);
    const dureeOk = ecartDuree <= rapport.dureeCibleSecondes * 0.25;
    rapport.controles.push({
      controle: "duree",
      resultat: dureeOk ? "ok" : "anomalie",
      detail: `${Math.round(rapport.dureeSecondes)} s pour une cible de ${rapport.dureeCibleSecondes} s`,
    });
    if (!dureeOk)
      rapport.anomalies.push("Durée éloignée de la cible (±25 %) : à vérifier par le référent.");
    for (const controle of ["synchronisation", "volume", "lisibilite_ecran"])
      rapport.controles.push({
        controle,
        resultat: "non_verifiable",
        detail: `à vérifier à la relecture (non mesuré ${d.services.nom === "simulation" ? "en simulation" : `par le service ${d.services.nom}`})`,
      });
    etape("controle_technique", dureeOk ? "ok" : "echec", dureeOk ? "" : "durée hors cible");
    const pire = Math.max(...rapport.segments.map((x) => x.ecart));
    rapport.controles.push({
      controle: "fidelite",
      resultat: "ok",
      detail: `écart maximal ${(pire * 100).toFixed(1).replace(".", ",")} % (seuil ${SEUIL_ECART * 100} %)`,
    });
    etape("controle_fidelite", "ok");

    // 8-9. Versions (dont faible débit) et dépôt ; la vidéo sera enregistrée « à relire » par l'appelant.
    const depot = await d.services.deposer(produits, vtt);
    depenser(depot.coutUSD);
    if (!depot.versions.some((v) => v.debitKbps <= DEBIT_FAIBLE_MAX_KBPS))
      throw new Arret(
        "arretee",
        "Aucune version faible débit produite.",
        "Version faible débit manquante : dépôt refusé.",
      );
    rapport.fichiers = { reference: depot.reference, versions: depot.versions };
    etape("depot_a_relire", "ok", depot.reference);
    rapport.resultat = "deposee";
  } catch (erreur) {
    if (!(erreur instanceof Arret)) throw erreur;
    rapport.resultat = erreur.resultat;
    const enCours = rapport.etapes.find((x) => x.statut === "non_fait");
    if (enCours) {
      enCours.statut = "echec";
      enCours.detail = erreur.message;
    }
    rapport.anomalies.push(erreur.message);
    if (erreur.escalade) rapport.escalades.push(erreur.escalade);
  }
  return rapport;
}
