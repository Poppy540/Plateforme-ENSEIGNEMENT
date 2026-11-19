import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parse, stringify } from "yaml";
import { AGENTS_PAR_UNITE } from "./agents-des-unites";
import { lirePack } from "./lecture";
import { creerPack } from "./nouveau";
import { packEnSql } from "./sql";
import { AGENTS_PAR_PAYS, verifierPack } from "./verification";

// « Ajouter un pays » guidé (Jalon 22, étape 3 ; ADR 0113) : un pays FICTIF « qq » est créé depuis le modèle,
// rempli au minimum avec les gabarits, vérifié puis transformé en SQL d'import, sans une ligne de code.
const racine = resolve(__dirname, "../../../..");
const modele = join(racine, "referentiels/_modele");
const gabarits = join(modele, "gabarits");

function referentielsTemporaires() {
  const dossier = mkdtempSync(join(tmpdir(), "referentiels-"));
  cpSync(modele, join(dossier, "_modele"), { recursive: true });
  return dossier;
}

const ecrire = (fichier: string, contenu: unknown) => {
  mkdirSync(join(fichier, ".."), { recursive: true });
  writeFileSync(fichier, stringify(contenu));
};

/** Copie un gabarit et remplit chacune de ses variables (valeurs fictives). */
function depuisGabarit(gabarit: string, cible: string, unite: string) {
  const brut = parse(readFileSync(join(gabarits, gabarit), "utf8"));
  brut.unite = unite;
  if (brut.variables)
    for (const cle of Object.keys(brut.variables)) brut.variables[cle] = `${cle} fictif`;
  if (brut.fiche_avatar)
    Object.assign(brut.fiche_avatar, { avatar: "a", voix: "v", langue: "fr", description: "d" });
  ecrire(cible, brut);
}

describe("ajouter un pays depuis le modèle", () => {
  it("crée le pack avec le code et le nom, sans gabarits ni marqueurs, et refuse d'écraser", () => {
    const referentiels = referentielsTemporaires();
    const cible = creerPack(referentiels, "pays-q", "qq", "Pays fictif Q");
    expect(readdirSync(cible)).not.toContain("gabarits");
    const pays = parse(readFileSync(join(cible, "pays.yaml"), "utf8"));
    expect(pays).toMatchObject({
      code: "qq",
      nom: "Pays fictif Q",
      statut_pack: "en_preparation",
      referentiel: { code: "qq-general" },
    });
    expect(readFileSync(join(cible, "SOURCES.md"), "utf8")).toContain(
      "Sources du pack Pays fictif Q",
    );
    expect(() => creerPack(referentiels, "pays-q", "qq", "Autre")).toThrow(/existe déjà/);
    expect(() => creerPack(referentiels, "autre", "QQ1", "Autre")).toThrow(/Code de pays invalide/);
    expect(() => creerPack(referentiels, "_cache", "qq", "Autre")).toThrow(/dossier invalide/);
  });

  it("un pack neuf est signalé bloquant, avec des messages qui disent quoi remplir", () => {
    const cible = creerPack(referentielsTemporaires(), "pays-q", "qq", "Pays fictif Q");
    const { constats } = verifierPack(cible, gabarits);
    const bloquants = constats.filter((c) => c.niveau === "bloquant");
    expect(bloquants.map((c) => `${c.fichier} : ${c.message}`)).toEqual(
      expect.arrayContaining([
        "pays.yaml : fuseau horaire manquant",
        "structure.yaml : aucun niveau",
      ]),
    );
    // Un modèle copié à la main (marqueurs non remplacés) est repéré.
    const copieMain = join(referentielsTemporaires(), "copie");
    cpSync(modele, copieMain, { recursive: true });
    expect(verifierPack(copieMain, gabarits).constats).toContainEqual({
      niveau: "bloquant",
      fichier: "pays.yaml",
      message: "modèle copié à la main : créez le pack avec `pnpm pack:nouveau`",
    });
  });

  it("rempli au minimum avec les gabarits, il n'a plus rien de bloquant et devient du SQL d'import", () => {
    const cible = creerPack(referentielsTemporaires(), "pays-q", "qq", "Pays fictif Q");
    const pays = parse(readFileSync(join(cible, "pays.yaml"), "utf8"));
    Object.assign(pays, { fuseau_horaire: "UTC", indicatifs_telephone: ["+999"] });
    ecrire(join(cible, "pays.yaml"), pays);
    ecrire(join(cible, "structure.yaml"), {
      cycles: [{ code: "c1", libelle: "Cycle 1", examen_fin: null }],
      niveaux: [
        { code: "n1", libelle: "Niveau 1", cycle: "c1", ordre: 1, code_interne: "secondaire-1" },
      ],
      series: [],
      examens: [],
    });
    ecrire(join(cible, "matieres.yaml"), {
      matieres: [
        { code: "mathematiques", libelle: "Mathématiques", famille: "maths", couche: "adaptable" },
      ],
    });
    ecrire(join(cible, "unites.yaml"), {
      unites: [{ code: "qq-n1-mathematiques", niveau: "n1", series: [], matiere: "mathematiques" }],
    });
    ecrire(join(cible, "familles.yaml"), {
      familles: [{ code: "maths", libelle: "Mathématiques (Q)", methode: "m", garde_fous: "g" }],
    });
    const programme = parse(readFileSync(join(gabarits, "programme.yaml"), "utf8"));
    Object.assign(programme, {
      unite: "qq-n1-mathematiques",
      chapitres: [{ ordre: 1, code: "nombres", titre: "Nombres (pays Q)", statut: "a_valider" }],
    });
    ecrire(join(cible, "programmes/qq-n1-mathematiques.yaml"), programme);

    // Programme sans réglages d'agents : bloquant, avec le gabarit à copier.
    expect(
      verifierPack(cible, gabarits).constats.filter((c) => c.niveau === "bloquant"),
    ).toContainEqual({
      niveau: "bloquant",
      fichier: "agents/evaluateur/qq-n1-mathematiques.yaml",
      message:
        "réglages manquants pour une unité qui a un programme : copier _modele/gabarits/agents/evaluateur.yaml",
    });

    for (const agent of AGENTS_PAR_UNITE)
      depuisGabarit(
        `agents/${agent}.yaml`,
        join(cible, `agents/${agent}/qq-n1-mathematiques.yaml`),
        "qq-n1-mathematiques",
      );
    const rapport = verifierPack(cible, gabarits);
    expect(rapport.constats.filter((c) => c.niveau === "bloquant")).toEqual([]);
    expect(rapport.pays).toBe("qq");
    // Il reste à compléter : agents du pays, Coordinateur de la famille, FAQ, sources.
    const aCompleter = rapport.constats
      .filter((c) => c.niveau === "a_completer")
      .map((c) => c.fichier);
    expect(aCompleter).toEqual(
      expect.arrayContaining([
        ...AGENTS_PAR_PAYS.map((a) => `agents/${a}/pays.yaml`),
        "agents/coordinateur/maths.yaml",
        "faq.yaml",
        "SOURCES.md",
      ]),
    );

    // Un gabarit copié sans remplir ses valeurs est signalé.
    mkdirSync(join(cible, "agents/tuteur"), { recursive: true });
    writeFileSync(
      join(cible, "agents/tuteur/pays.yaml"),
      readFileSync(join(gabarits, "agents/tuteur.yaml"), "utf8"),
    );
    expect(verifierPack(cible, gabarits).constats).toContainEqual({
      niveau: "a_completer",
      fichier: "agents/tuteur/pays.yaml",
      message: "variables vides (l'agent refusera de travailler) : PAYS, REFERENT, DATE, VERSION",
    });

    const sql = packEnSql(lirePack(cible));
    expect(sql).toContain("'qq-general'");
    expect(sql).toContain("Nombres (pays Q)");
  });

  it("les gabarits d'agents demandent exactement les variables des prompts, sauf les valeurs calculées", () => {
    const calculees = new Set([
      "CHAPITRE_EN_COURS",
      "LISTE_CHAPITRES",
      "DUREE",
      "VERSION_REFERENTIEL",
      "CANAUX_APPROUVES",
      "CONDITIONS_VALIDEES",
      "DELAIS_RELANCE",
      "FAQ_RECRUTEMENT",
      "MODELES_MESSAGES",
      "SOURCES_AUTORISEES",
    ]);
    for (const agent of [...AGENTS_PAR_UNITE, ...AGENTS_PAR_PAYS, "coordinateur"]) {
      if (agent === "production-video") continue; // fiche d'avatar, pas de variables
      const prompt = readFileSync(join(racine, "agents", agent, "prompt.md"), "utf8");
      const duPrompt = [...new Set([...prompt.matchAll(/\{\{([A-Z_]+)\}\}/g)].map((m) => m[1]))]
        // Le référentiel de la Conformité est celui de l'unité contrôlée, posé à l'exécution.
        .filter((v) => !calculees.has(v) && !(agent === "conformite" && v === "REFERENTIEL"))
        .sort();
      const gabarit = parse(readFileSync(join(gabarits, `agents/${agent}.yaml`), "utf8"));
      expect(Object.keys(gabarit.variables).sort(), agent).toEqual(duPrompt);
    }
  });

  it("le pilote et le pays fictif Z n'ont rien de bloquant", () => {
    for (const dossier of ["gabon", "zz-fictif"]) {
      const { constats } = verifierPack(join(racine, "referentiels", dossier), gabarits);
      expect(
        constats.filter((c) => c.niveau === "bloquant"),
        dossier,
      ).toEqual([]);
    }
  });
});
