import { describe, expect, it } from "vitest";
import { projectCases, resourceNeeds } from "./projection";

describe("projectCases", () => {
  it("projects a growing cluster upward with a band around it", () => {
    const p = projectCases([1, 1, 2, 4, 6, 9, 12]);
    expect(p.growing).toBe(true);
    expect(p.daily[0].expected).toBeGreaterThan(12);
    expect(p.daily[2].high).toBeGreaterThanOrEqual(p.daily[2].expected);
    expect(p.daily[2].low).toBeLessThanOrEqual(p.daily[2].expected);
  });

  it("stays flat for a stable series", () => {
    const p = projectCases([3, 3, 3, 3, 3]);
    expect(p.growing).toBe(false);
    expect(p.daily.every((d) => d.expected === 3)).toBe(true);
  });

  it("caps explosive growth at doubling every 2 days", () => {
    const p = projectCases([0, 0, 1, 10, 100]);
    expect(p.doublingDays).toBeGreaterThanOrEqual(2);
  });
});

describe("resourceNeeds", () => {
  it("uses the sourced 13.3% dengue admission rate for beds", () => {
    const p = projectCases([2, 4, 6, 9, 12]);
    const beds = resourceNeeds("dengue_like", p).find((r) => r.item === "Hospital beds")!;
    expect(beds.expected).toBe(Math.ceil(0.133 * p.total.expected));
  });
});
