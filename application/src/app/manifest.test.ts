import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("manifeste de la PWA", () => {
  it("déclare une application installable en français", () => {
    const m = manifest();
    expect(m.lang).toBe("fr");
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/");
    expect(m.icons?.length).toBeGreaterThan(0);
  });
});
