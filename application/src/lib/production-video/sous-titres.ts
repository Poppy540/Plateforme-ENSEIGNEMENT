// Sous-titres français (WebVTT) tirés du texte validé, jamais de la transcription : le texte affiché est
// exactement celui que le référent a validé. Découpage en répliques courtes, minutage proportionnel au
// nombre de mots dans la durée réelle de chaque segment.

const LONGUEUR_MAX = 84; // deux lignes d'environ 42 caractères

export function decouperRepliques(texte: string): string[] {
  const phrases = texte
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?…])\s+/)
    .filter(Boolean);
  const repliques: string[] = [];
  for (const phrase of phrases) {
    let reste = phrase;
    while (reste.length > LONGUEUR_MAX) {
      // Coupure de préférence après une virgule (si elle n'est pas trop tôt), sinon à un espace.
      const virgule = reste.lastIndexOf(", ", LONGUEUR_MAX);
      const espace = reste.lastIndexOf(" ", LONGUEUR_MAX);
      const position =
        virgule > LONGUEUR_MAX / 2 ? virgule + 1 : espace > 0 ? espace : LONGUEUR_MAX;
      repliques.push(reste.slice(0, position).trim());
      reste = reste.slice(position).trim();
    }
    if (reste) repliques.push(reste);
  }
  return repliques;
}

const horodatage = (s: number) => {
  const ms = Math.round(s * 1000);
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const sec = Math.floor((ms % 60_000) / 1000);
  const reste = ms % 1000;
  const deux = (n: number) => String(n).padStart(2, "0");
  return `${deux(h)}:${deux(m)}:${deux(sec)}.${String(reste).padStart(3, "0")}`;
};

export function sousTitresVtt(segments: { texte: string; dureeSecondes: number }[]): string {
  const lignes = ["WEBVTT", ""];
  let debut = 0;
  let numero = 1;
  for (const segment of segments) {
    const repliques = decouperRepliques(segment.texte);
    const total = repliques.reduce((s, r) => s + r.split(" ").length, 0) || 1;
    let t = debut;
    for (const r of repliques) {
      const duree = (segment.dureeSecondes * r.split(" ").length) / total;
      lignes.push(String(numero++), `${horodatage(t)} --> ${horodatage(t + duree)}`, r, "");
      t += duree;
    }
    debut += segment.dureeSecondes;
  }
  return lignes.join("\n");
}

/** Texte des répliques (pour vérifier qu'aucun mot du script n'a été modifié). */
export function texteDesSousTitres(vtt: string): string {
  return vtt
    .split("\n\n")
    .slice(1)
    .map((bloc) => bloc.split("\n").slice(2).join(" ").trim())
    .filter(Boolean)
    .join(" ");
}
