import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS, simulate } from "./sim";

describe("simulate", () => {
  const base = simulate(DEFAULT_PARAMS, "baseline");
  const priora = simulate(DEFAULT_PARAMS, "priora");

  it("serves every patient in both modes", () => {
    const n = (r: typeof base) => Object.values(r.byColour).reduce((s, c) => s + c.n, 0);
    expect(n(base)).toBe(DEFAULT_PARAMS.patients);
    expect(n(priora)).toBe(DEFAULT_PARAMS.patients);
  });

  it("is deterministic for a given seed", () => {
    expect(simulate(DEFAULT_PARAMS, "priora").byColour).toEqual(priora.byColour);
  });

  it("cuts waits for critical patients", () => {
    expect(priora.byColour.RED.medianWait).toBeLessThan(base.byColour.RED.medianWait);
    expect(priora.byColour.ORANGE.withinTarget).toBeGreaterThan(base.byColour.ORANGE.withinTarget);
  });

  it("reduces redirects and doctor time on paper files", () => {
    expect(priora.redirects).toBeLessThan(base.redirects);
    expect(priora.doctorMinutesOnFiles).toBeLessThan(base.doctorMinutesOnFiles);
  });
});
