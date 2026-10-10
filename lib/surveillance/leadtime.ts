import { levelFor, scoreDay } from "./detect";

/**
 * Detection lead-time study: Priora syndromic early warning vs today's lab-confirmed reporting.
 *
 * Monte Carlo over outbreak scenarios in a district of N areas:
 *  - Background syndrome cases per area per day ~ Poisson(backgroundRate).
 *  - One outbreak per scenario in one area, starting on `outbreakStart`, growing exponentially
 *    (doubling time drawn from a range).
 *  - PRIORA sees a case only if the patient passes a Priora kiosk (coverage) AND the AI tags the
 *    syndrome (sensitivity); non-cases are sometimes mis-tagged (falsePositiveRate). Detection =
 *    the same EARS C2 rule the live system runs (score ≥ 3 and ≥ 3 cases).
 *  - TODAY: a case counts only if it is lab-tested (testingRate) and positive (labSensitivity);
 *    results take labDelay days; cases are reported in weekly batches with reportingLag days,
 *    and each weekly report arrives with probability reportCompliance (missed weeks arrive late,
 *    the following week). Alert = weekly confirmed count above the baseline mean + 2 SD (min 3).
 * Every assumption is a parameter; defaults are documented, and sourced where possible.
 */

export type LeadTimeParams = {
  scenarios: number;
  areas: number;
  days: number;
  outbreakStart: number;
  backgroundRate: number; // true syndrome cases per area per day (care-seeking)
  initialOutbreakCases: [number, number]; // extra cases/day at outbreak start (range)
  doublingDays: [number, number]; // outbreak growth (range)
  coverage: number; // share of care-seeking patients who pass a Priora kiosk
  sensitivity: number; // AI syndrome-tagging recall
  falsePositiveRate: number; // mis-tagged non-cases per area per day
  testingRate: number; // share of suspected cases lab-tested today
  labSensitivity: number;
  labDelay: [number, number]; // days from visit to result (range)
  reportingLag: number; // days after an epi-week ends until the weekly report is compiled
  reportCompliance: number; // probability a weekly report arrives on time
  seed: number;
};

export const DEFAULT_LEADTIME: LeadTimeParams = {
  scenarios: 400,
  areas: 12,
  days: 77,
  outbreakStart: 49,
  backgroundRate: 0.6,
  initialOutbreakCases: [0.5, 2],
  doublingDays: [3, 7],
  coverage: 0.6,
  sensitivity: 0.85,
  falsePositiveRate: 0.05,
  testingRate: 0.3,
  labSensitivity: 0.9,
  labDelay: [1, 3],
  reportingLag: 3,
  reportCompliance: 0.75, // NIH Pakistan IDSR weekly bulletin, wk 44-2025: 75% of expected reports received
  seed: 7,
};

export type ScenarioResult = {
  prioraDay: number | null; // days after outbreak start the alert fired
  todayDay: number | null;
  prioraFalseAlarms: number; // alert-days in areas/periods without an outbreak
  todayFalseAlarms: number;
};

export type LeadTimeSummary = {
  scenarios: number;
  medianLeadDays: number | null; // among scenarios both systems detected
  leadIqr: [number, number] | null;
  prioraDetectedWithin14: number; // share of outbreaks detected within 14 days of starting
  todayDetectedWithin14: number;
  prioraMedianDay: number | null;
  todayMedianDay: number | null;
  prioraFalseAlarmsPerAreaMonth: number;
  todayFalseAlarmsPerAreaMonth: number;
  leadHistogram: { days: number; count: number }[]; // days earlier (negative = later)
  results: ScenarioResult[];
};

/** Deterministic PRNG (mulberry32). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function poisson(r: () => number, lambda: number) {
  if (lambda <= 0) return 0;
  if (lambda > 30) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * gauss(r)));
  let k = 0;
  for (let p = Math.exp(-lambda), sum = p, u = r(); u > sum; ) sum += p = (p * lambda) / ++k;
  return k;
}
function gauss(r: () => number) {
  return Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
}
const binom = (r: () => number, n: number, p: number) => {
  let k = 0;
  for (let i = 0; i < n; i++) if (r() < p) k++;
  return k;
};
const between = (r: () => number, [lo, hi]: [number, number]) => lo + r() * (hi - lo);

export function simulateScenario(p: LeadTimeParams, r: () => number): ScenarioResult {
  const init = between(r, p.initialOutbreakCases);
  const doubling = between(r, p.doublingDays);
  const outbreakArea = 0; // areas are exchangeable

  // True care-seeking syndrome cases per area per day.
  const truth = Array.from({ length: p.areas }, (_, a) =>
    Array.from({ length: p.days }, (_, d) => {
      let n = poisson(r, p.backgroundRate);
      if (a === outbreakArea && d >= p.outbreakStart) n += poisson(r, init * 2 ** ((d - p.outbreakStart) / doubling));
      return n;
    }),
  );

  // ── Priora: kiosk coverage × AI tagging, plus mis-tags; EARS C2 daily ──
  let prioraDay: number | null = null;
  let prioraFalseAlarms = 0;
  for (let a = 0; a < p.areas; a++) {
    const seen = truth[a].map((n) => binom(r, n, p.coverage * p.sensitivity) + poisson(r, p.falsePositiveRate));
    for (let d = 9; d < p.days; d++) {
      if (levelFor(seen[d], scoreDay(seen, d)?.score ?? null) !== "alert") continue;
      if (a === outbreakArea && d >= p.outbreakStart) prioraDay ??= d - p.outbreakStart;
      else prioraFalseAlarms++;
    }
  }

  // ── Today: lab-confirmed, weekly reports with lag and missed weeks ──
  let todayDay: number | null = null;
  let todayFalseAlarms = 0;
  const weeks = Math.ceil(p.days / 7) + 3;
  for (let a = 0; a < p.areas; a++) {
    // Confirmed cases by the epi-week their result became available.
    const confirmedByWeek = Array(weeks).fill(0);
    truth[a].forEach((n, d) => {
      const confirmed = binom(r, n, p.testingRate * p.labSensitivity);
      for (let i = 0; i < confirmed; i++) {
        const w = Math.floor((d + Math.round(between(r, p.labDelay))) / 7);
        if (w < weeks) confirmedByWeek[w]++;
      }
    });
    // Weekly reporting with missed reports rolling into the next week.
    const reportedOnDay: { day: number; count: number }[] = [];
    let carry = 0;
    for (let w = 0; w < weeks; w++) {
      carry += confirmedByWeek[w];
      if (r() < p.reportCompliance) {
        reportedOnDay.push({ day: (w + 1) * 7 + p.reportingLag, count: carry });
        carry = 0;
      }
    }
    // Threshold from the pre-outbreak baseline weeks.
    const baseWeeks = Math.floor(p.outbreakStart / 7);
    const base = confirmedByWeek.slice(1, baseWeeks);
    const mean = base.reduce((s, x) => s + x, 0) / Math.max(base.length, 1);
    const sd = Math.sqrt(base.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(base.length, 1));
    const threshold = Math.max(3, mean + 2 * sd);
    for (const rep of reportedOnDay) {
      if (rep.day >= p.days + 21 || rep.count <= threshold) continue;
      if (a === outbreakArea && rep.day >= p.outbreakStart) todayDay ??= rep.day - p.outbreakStart;
      else todayFalseAlarms++;
    }
  }

  return { prioraDay, todayDay, prioraFalseAlarms, todayFalseAlarms };
}

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};
const quantile = (xs: number[], q: number) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(q * xs.length))];

export function runLeadTime(p: LeadTimeParams = DEFAULT_LEADTIME): LeadTimeSummary {
  const r = rng(p.seed);
  const results = Array.from({ length: p.scenarios }, () => simulateScenario(p, r));
  const both = results.filter((x) => x.prioraDay != null && x.todayDay != null);
  const leads = both.map((x) => x.todayDay! - x.prioraDay!);
  const hist = new Map<number, number>();
  for (const l of leads) hist.set(l, (hist.get(l) ?? 0) + 1);
  // False alarms are counted per area-month of monitoring.
  const areaMonths = (p.areas * (p.days - 9)) / 30;
  return {
    scenarios: p.scenarios,
    medianLeadDays: median(leads),
    leadIqr: leads.length ? [quantile(leads, 0.25), quantile(leads, 0.75)] : null,
    prioraDetectedWithin14: results.filter((x) => x.prioraDay != null && x.prioraDay <= 14).length / results.length,
    todayDetectedWithin14: results.filter((x) => x.todayDay != null && x.todayDay <= 14).length / results.length,
    prioraMedianDay: median(results.filter((x) => x.prioraDay != null).map((x) => x.prioraDay!)),
    todayMedianDay: median(results.filter((x) => x.todayDay != null).map((x) => x.todayDay!)),
    prioraFalseAlarmsPerAreaMonth: results.reduce((s, x) => s + x.prioraFalseAlarms, 0) / (results.length * areaMonths),
    todayFalseAlarmsPerAreaMonth: results.reduce((s, x) => s + x.todayFalseAlarms, 0) / (results.length * areaMonths),
    leadHistogram: [...hist].map(([days, count]) => ({ days, count })).sort((a, b) => a.days - b.days),
    results,
  };
}
