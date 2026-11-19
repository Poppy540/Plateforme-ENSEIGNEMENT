// Politique de sécurité du contenu (revue de sécurité D8, ADR 0049) : scripts autorisés par un nonce tiré à
// chaque requête (plus de 'unsafe-inline' pour les scripts : un script injecté dans une page ne s'exécute pas).
// 'strict-dynamic' : les fichiers chargés par les scripts de Next.js (eux-mêmes porteurs du nonce) sont admis.
// Styles : 'unsafe-inline' gardé (attributs style de React ; pas d'exécution de code).

export function politiqueDeContenu(nonce: string, developpement: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${developpement ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "media-src 'self' blob: https:",
    "connect-src 'self'",
    "font-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

/** Nonce imprévisible, propre à une requête (base64 de 16 octets aléatoires). */
export function nouveauNonce(): string {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(16))).toString("base64");
}
