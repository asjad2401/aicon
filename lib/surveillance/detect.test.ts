import { describe, expect, it } from "vitest";
import { detect, levelFor, pkDate, scoreDay } from "./detect";

const TODAY = "2026-10-10";
const at = (daysAgo: number) => new Date(Date.parse(`${TODAY}T09:00:00+05:00`) - daysAgo * 86_400_000);

function cases(area: string, syndrome: string, perDay: number[]) {
  // perDay[0] = 29 days ago … perDay[29] = today
  return perDay.flatMap((n, i) => Array.from({ length: n }, () => ({ at: at(perDay.length - 1 - i), area, syndromes: [syndrome] })));
}

describe("scoreDay", () => {
  it("uses a 7-day baseline ending 2 days before the test day", () => {
    const counts = [1, 1, 1, 1, 1, 1, 1, 9, 9, 6];
    const r = scoreDay(counts, 9)!;
    expect(r.mean).toBe(1); // indices 0–6; the two lag days (7, 8) are excluded
    expect(r.score).toBe(5); // (6 − 1) / max(sd 0, floor 1)
  });

  it("returns null without enough history", () => {
    expect(scoreDay([1, 2, 3], 2)).toBeNull();
  });
});

describe("levelFor", () => {
  it("needs both a high score and enough cases", () => {
    expect(levelFor(3, 3)).toBe("alert");
    expect(levelFor(2, 5)).toBe("watch");
    expect(levelFor(1, 9)).toBeNull();
  });
});

describe("detect", () => {
  const background = Array(30).fill(1);
  const outbreak = [...Array(25).fill(1), 2, 4, 6, 9, 12];

  const { signals } = detect(
    [...cases("g-9", "dengue_like", outbreak), ...cases("f-7", "dengue_like", background)],
    { today: TODAY, areas: ["g-9", "f-7"], syndromes: ["dengue_like"] },
  );
  const get = (area: string) => signals.find((s) => s.area === area && s.syndrome === "dengue_like")!;

  it("flags an emerging cluster", () => {
    expect(get("g-9")).toMatchObject({ today: 12, level: "alert", last3: 27 });
  });

  it("stays quiet on a stable background", () => {
    expect(get("f-7").level).toBeNull();
  });

  it("aggregates district-wide counts", () => {
    expect(get("all").today).toBe(13);
  });

  it("buckets by Pakistan calendar day", () => {
    expect(pkDate("2026-10-09T19:30:00Z")).toBe("2026-10-10"); // 00:30 PKT
  });
});
