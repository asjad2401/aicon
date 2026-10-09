import { describe, expect, it } from "vitest";
import { rankQueue } from "./queue";

const now = new Date("2026-10-10T10:00:00Z");
const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000);

describe("rankQueue", () => {
  it("orders by severity before arrival time", () => {
    const ranked = rankQueue(
      [
        { id: "green-early", colour: "GREEN", arrivedAt: ago(90) },
        { id: "red-late", colour: "RED", arrivedAt: ago(1) },
        { id: "yellow", colour: "YELLOW", arrivedAt: ago(30) },
        { id: "orange", colour: "ORANGE", arrivedAt: ago(5) },
      ] as const,
      now,
    );
    expect(ranked.map((r) => r.id)).toEqual(["red-late", "orange", "yellow", "green-early"]);
  });

  it("within a colour, the longest relative wait goes first", () => {
    const ranked = rankQueue(
      [
        { id: "y-10", colour: "YELLOW", arrivedAt: ago(10) },
        { id: "y-50", colour: "YELLOW", arrivedAt: ago(50) },
      ] as const,
      now,
    );
    expect(ranked[0].id).toBe("y-50");
  });

  it("promotes an overdue GREEN into the YELLOW band, but never above ORANGE", () => {
    const ranked = rankQueue(
      [
        { id: "orange", colour: "ORANGE", arrivedAt: ago(1) },
        { id: "yellow-fresh", colour: "YELLOW", arrivedAt: ago(5) },
        { id: "green-5h", colour: "GREEN", arrivedAt: ago(300) },
      ] as const,
      now,
    );
    expect(ranked.map((r) => r.id)).toEqual(["orange", "green-5h", "yellow-fresh"]);
    expect(ranked[1]).toMatchObject({ overdue: true, band: 1 });
  });

  it("reports SLA remaining against the SATS target", () => {
    const [r] = rankQueue([{ colour: "ORANGE", arrivedAt: ago(15) }], now);
    expect(Math.round(r.slaRemaining)).toBe(-5);
    expect(r.overdue).toBe(true);
  });
});
