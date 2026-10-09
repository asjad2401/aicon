/**
 * Syndromic outbreak detection: CDC EARS C2-style aberration detection.
 *
 * For each (area, syndrome) daily count series:
 *   baseline = the 7 days ending 2 days before the day being tested (the 2-day lag keeps an
 *   emerging cluster from contaminating its own baseline)
 *   score    = (today − baseline mean) / max(baseline SD, 1)
 *   ALERT if score ≥ 3 and today ≥ 3 cases;  WATCH if score ≥ 2 and today ≥ 2.
 * Deterministic and explainable: every alert shows its counts, baseline and score.
 */

export type CaseRecord = { at: Date | string; area: string | null; syndromes: string[] };

export type Level = "alert" | "watch" | null;

export type SeriesPoint = { date: string; count: number; score: number | null; level: Level };

export type Signal = {
  area: string; // area id, or "all" for district-wide
  syndrome: string;
  series: SeriesPoint[];
  today: number;
  last3: number;
  baselineMean: number;
  baselineSd: number;
  score: number;
  level: Level;
};

export const LAG = 2;
export const BASELINE_DAYS = 7;
const SD_FLOOR = 1;

const PK_OFFSET_MS = 5 * 3600_000;
/** Calendar date in Pakistan time (UTC+5) as YYYY-MM-DD. */
export function pkDate(at: Date | string | number) {
  return new Date(new Date(at).getTime() + PK_OFFSET_MS).toISOString().slice(0, 10);
}

function dayList(endDate: string, days: number) {
  const end = new Date(`${endDate}T00:00:00Z`).getTime();
  return Array.from({ length: days }, (_, i) => new Date(end - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10));
}

export function scoreDay(counts: number[], i: number) {
  // Baseline = days t−9 … t−3: skips the 2 lag days (t−1, t−2) before the tested day t.
  const start = i - LAG - BASELINE_DAYS;
  if (start < 0) return null;
  const base = counts.slice(start, i - LAG);
  const mean = base.reduce((a, b) => a + b, 0) / base.length;
  const sd = Math.sqrt(base.reduce((a, b) => a + (b - mean) ** 2, 0) / base.length);
  const score = (counts[i] - mean) / Math.max(sd, SD_FLOOR);
  return { mean, sd, score };
}

export function levelFor(count: number, score: number | null): Level {
  if (score == null) return null;
  if (score >= 3 && count >= 3) return "alert";
  if (score >= 2 && count >= 2) return "watch";
  return null;
}

/** Builds daily series and scores for every (area, syndrome) pair plus district-wide totals. */
export function detect(records: CaseRecord[], opts: { today?: string; days?: number; areas: string[]; syndromes: string[] }) {
  const today = opts.today ?? pkDate(Date.now());
  const days = dayList(today, opts.days ?? 30);
  const index = new Map(days.map((d, i) => [d, i]));
  const counts = new Map<string, number[]>();
  const key = (area: string, syndrome: string) => `${area}|${syndrome}`;
  for (const area of [...opts.areas, "all"]) for (const s of opts.syndromes) counts.set(key(area, s), Array(days.length).fill(0));

  for (const r of records) {
    const i = index.get(pkDate(r.at));
    if (i == null) continue;
    for (const s of r.syndromes) {
      if (r.area && counts.has(key(r.area, s))) counts.get(key(r.area, s))![i]++;
      if (counts.has(key("all", s))) counts.get(key("all", s))![i]++;
    }
  }

  const signals: Signal[] = [];
  for (const [k, c] of counts) {
    const [area, syndrome] = k.split("|");
    const series = c.map((count, i) => {
      const sc = scoreDay(c, i);
      return { date: days[i], count, score: sc ? Math.round(sc.score * 10) / 10 : null, level: levelFor(count, sc?.score ?? null) };
    });
    const last = c.length - 1;
    const sc = scoreDay(c, last)!;
    signals.push({
      area,
      syndrome,
      series,
      today: c[last],
      last3: c[last] + c[last - 1] + c[last - 2],
      baselineMean: Math.round(sc.mean * 10) / 10,
      baselineSd: Math.round(sc.sd * 10) / 10,
      score: Math.round(sc.score * 10) / 10,
      level: levelFor(c[last], sc.score),
    });
  }
  return { today, days, signals };
}
