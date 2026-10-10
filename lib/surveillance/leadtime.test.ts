import { describe, expect, it } from "vitest";
import { DEFAULT_LEADTIME, runLeadTime } from "./leadtime";

const small = { ...DEFAULT_LEADTIME, scenarios: 120 };

describe("lead-time study", () => {
  it("is deterministic for a given seed", () => {
    expect(runLeadTime(small).medianLeadDays).toBe(runLeadTime(small).medianLeadDays);
  });

  it("detects outbreaks earlier than lab-confirmed weekly reporting under default assumptions", () => {
    const s = runLeadTime(small);
    expect(s.medianLeadDays).toBeGreaterThan(0);
    expect(s.prioraDetectedWithin14).toBeGreaterThan(s.todayDetectedWithin14);
  });

  it("keeps false alarms rare", () => {
    expect(runLeadTime(small).prioraFalseAlarmsPerAreaMonth).toBeLessThan(0.1);
  });

  it("loses its advantage without kiosk coverage", () => {
    const none = runLeadTime({ ...small, coverage: 0 });
    expect(none.prioraDetectedWithin14).toBe(0);
  });

  it("detects later when AI tagging is weaker", () => {
    const weak = runLeadTime({ ...small, sensitivity: 0.3 });
    expect(weak.prioraDetectedWithin14).toBeLessThan(runLeadTime(small).prioraDetectedWithin14);
  });
});
