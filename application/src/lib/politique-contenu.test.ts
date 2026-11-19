import { describe, expect, it } from "vitest";
import { nouveauNonce, politiqueDeContenu } from "./politique-contenu";

describe("politique de sécurité du contenu", () => {
  it("n'autorise les scripts que par le nonce, jamais en ligne sans nonce", () => {
    const p = politiqueDeContenu("abc123", false);
    const scripts = p.split("; ").find((d) => d.startsWith("script-src"));
    expect(scripts).toBe("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(p).toContain("frame-ancestors 'none'");
    expect(p).toContain("object-src 'none'");
    expect(politiqueDeContenu("x", true)).toContain("'unsafe-eval'");
  });

  it("tire un nonce différent à chaque requête", () => {
    const a = nouveauNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(nouveauNonce()).not.toBe(a);
  });
});
