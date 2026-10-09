import { describe, expect, it } from "vitest";
import { kappa, kappaLabel, triageAgreement, type Pair } from "./stats";

const same = (c: Pair["nurse"], n: number): Pair[] => Array.from({ length: n }, () => ({ nurse: c, system: c }));

describe("kappa", () => {
  it("is 1 for perfect agreement", () => {
    expect(kappa([...same("RED", 3), ...same("GREEN", 5), ...same("YELLOW", 2)])).toBeCloseTo(1);
  });

  it("matches a hand-computed example", () => {
    // 2×2 within 4 categories: po = 0.8, pe = 0.5 → κ = 0.6
    const pairs: Pair[] = [
      ...same("RED", 40),
      ...same("GREEN", 40),
      ...Array.from({ length: 10 }, () => ({ nurse: "RED", system: "GREEN" }) as Pair),
      ...Array.from({ length: 10 }, () => ({ nurse: "GREEN", system: "RED" }) as Pair),
    ];
    expect(kappa(pairs)).toBeCloseTo(0.6, 5);
  });

  it("weighted kappa penalises near-misses less than far misses", () => {
    const near: Pair[] = [...same("RED", 5), ...same("GREEN", 5), { nurse: "ORANGE", system: "RED" }, { nurse: "YELLOW", system: "GREEN" }];
    const far: Pair[] = [...same("RED", 5), ...same("GREEN", 5), { nurse: "ORANGE", system: "GREEN" }, { nurse: "YELLOW", system: "RED" }];
    expect(kappa(near, true)!).toBeGreaterThan(kappa(far, true)!);
  });

  it("returns null with no data", () => {
    expect(kappa([])).toBeNull();
  });
});

describe("triageAgreement", () => {
  it("counts system under- and over-triage relative to the nurse", () => {
    const r = triageAgreement([
      { nurse: "ORANGE", system: "YELLOW" }, // system under-triaged
      { nurse: "GREEN", system: "YELLOW" }, // system over-triaged
      { nurse: "RED", system: "RED" },
      { nurse: "GREEN", system: "GREEN" },
    ]);
    expect(r).toMatchObject({ n: 4, agreement: 0.5, systemUnderTriage: 0.25, systemOverTriage: 0.25 });
    expect(r.matrix[1][2]).toBe(1); // nurse ORANGE row, system YELLOW column
  });

  it("labels kappa on the Landis & Koch scale", () => {
    expect(kappaLabel(0.85)).toBe("almost perfect");
    expect(kappaLabel(0.7)).toBe("substantial");
  });
});
