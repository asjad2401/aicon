import { describe, expect, it } from "vitest";
import { computeTEWS, tewsToColour, triage } from "./sats";

const normal = {
  rr: 14,
  hr: 80,
  sbp: 120,
  temp: 37,
  avpu: "alert",
  mobility: "walking",
  trauma: false,
} as const;

describe("computeTEWS", () => {
  it("scores normal adult vitals as 0 and complete", () => {
    expect(computeTEWS(normal)).toMatchObject({ score: 0, complete: true, reasons: [] });
  });

  it.each([
    [{ rr: 8 }, 2],
    [{ rr: 15 }, 1],
    [{ rr: 25 }, 2],
    [{ rr: 30 }, 3],
    [{ hr: 40 }, 2],
    [{ hr: 45 }, 1],
    [{ hr: 105 }, 1],
    [{ hr: 120 }, 2],
    [{ hr: 130 }, 3],
    [{ sbp: 70 }, 3],
    [{ sbp: 75 }, 2],
    [{ sbp: 90 }, 1],
    [{ sbp: 200 }, 2],
    [{ temp: 34.5 }, 2],
    [{ temp: 38.5 }, 2],
    [{ avpu: "confused" }, 1],
    [{ avpu: "pain" }, 2],
    [{ avpu: "unresponsive" }, 3],
    [{ mobility: "with_help" }, 1],
    [{ mobility: "immobile" }, 2],
    [{ trauma: true }, 1],
  ] as const)("scores %o as %i", (override, points) => {
    expect(computeTEWS({ ...normal, ...override }).score).toBe(points);
  });

  it("flags incomplete vitals", () => {
    expect(computeTEWS({ hr: 80 }).complete).toBe(false);
  });
});

describe("tewsToColour", () => {
  it.each([
    [0, "GREEN"],
    [2, "GREEN"],
    [3, "YELLOW"],
    [4, "YELLOW"],
    [5, "ORANGE"],
    [6, "ORANGE"],
    [7, "RED"],
    [12, "RED"],
  ] as const)("TEWS %i → %s", (score, colour) => {
    expect(tewsToColour(score)).toBe(colour);
  });
});

describe("triage", () => {
  it("chest pain alone is a provisional ORANGE pending vitals", () => {
    const r = triage({ discriminatorIds: ["chest_pain"] });
    expect(r).toMatchObject({ colour: "ORANGE", provisional: true, targetMinutes: 10 });
    expect(r.flags).toContain("vitals_pending");
  });

  it("vitals can escalate above the discriminator colour", () => {
    const r = triage({
      discriminatorIds: ["chest_pain"],
      vitals: { ...normal, hr: 130, rr: 25, sbp: 95 }, // 3 + 2 + 1 = 6 → ORANGE
    });
    expect(r.tews).toBe(6);
    expect(r.colour).toBe("ORANGE");

    const worse = triage({
      discriminatorIds: ["chest_pain"],
      vitals: { ...normal, hr: 130, rr: 30, sbp: 95 }, // 3 + 3 + 1 = 7 → RED
    });
    expect(worse.colour).toBe("RED");
    expect(worse.provisional).toBe(false);
  });

  it("an emergency discriminator forces RED even with normal vitals", () => {
    expect(triage({ discriminatorIds: ["seizure_current"], vitals: normal }).colour).toBe("RED");
  });

  it("no discriminators and normal vitals is GREEN with a reason", () => {
    const r = triage({ discriminatorIds: [], vitals: normal });
    expect(r.colour).toBe("GREEN");
    expect(r.targetMinutes).toBe(240);
    expect(r.reasons.length).toBeGreaterThan(0);
  });

  it("maps self-reported pain score to pain discriminators", () => {
    expect(triage({ discriminatorIds: [], painScore: 9 }).colour).toBe("ORANGE");
    expect(triage({ discriminatorIds: [], painScore: 6 }).colour).toBe("YELLOW");
    expect(triage({ discriminatorIds: [], painScore: 3 }).colour).toBe("GREEN");
  });

  it("escalates uncertain GREEN to YELLOW for nurse review", () => {
    const r = triage({ discriminatorIds: [], uncertain: true });
    expect(r.colour).toBe("YELLOW");
    expect(r.flags).toContain("nurse_review");
  });

  it("never applies adult TEWS to children and keeps them at least YELLOW", () => {
    const r = triage({ discriminatorIds: [], age: 6, vitals: normal });
    expect(r.tews).toBeNull();
    expect(r.colour).toBe("YELLOW");
    expect(r.flags).toContain("paediatric_review");
  });

  it("ignores unknown discriminator IDs from the AI", () => {
    expect(triage({ discriminatorIds: ["made_up_sign"], vitals: normal }).colour).toBe("GREEN");
  });

  it("orders matched discriminators by severity", () => {
    const r = triage({ discriminatorIds: ["abdominal_pain", "vomiting_fresh_blood"] });
    expect(r.matched).toEqual(["vomiting_fresh_blood", "abdominal_pain"]);
    expect(r.colour).toBe("ORANGE");
  });
});
