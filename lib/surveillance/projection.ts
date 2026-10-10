/**
 * Short-term surge projection for an active cluster, translated into resources.
 * Log-linear fit of recent daily cases (log(count + 0.5) vs day) → growth rate, applied to
 * today's observed count HORIZON days ahead, with a low/high band from the fit's standard error. Growth is capped
 * (doubling no faster than 2 days) so one noisy day can't produce absurd projections.
 */

export const HORIZON = 3;
const FIT_DAYS = 5;
const MAX_DAILY_GROWTH = Math.log(2) / 2; // doubling every 2 days at most

export type Projection = {
  daily: { day: number; expected: number; low: number; high: number }[]; // day 1..HORIZON
  total: { expected: number; low: number; high: number };
  doublingDays: number | null; // null when not growing
  growing: boolean;
};

export function projectCases(series: number[]): Projection {
  const recent = series.slice(-FIT_DAYS);
  const n = recent.length;
  const xs = recent.map((_, i) => i);
  const ys = recent.map((c) => Math.log(c + 0.5));
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  let slope = xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) / sxx;
  const intercept = my - slope * mx;
  const resid = ys.map((y, i) => y - (intercept + slope * xs[i]));
  const se = Math.sqrt(resid.reduce((a, r) => a + r * r, 0) / Math.max(n - 2, 1) / sxx);
  slope = Math.min(slope, MAX_DAILY_GROWTH);
  const growing = slope > 0.05;

  // Anchor on today's observed count (not the fitted line, which early zeros can drag below reality).
  const base = recent[n - 1] > 0 ? recent[n - 1] : Math.max(0, Math.exp(intercept + slope * (n - 1)) - 0.5);
  const at = (k: number, s: number) => Math.max(0, base * Math.exp(s * k));
  const daily = Array.from({ length: HORIZON }, (_, i) => {
    const k = i + 1;
    return {
      day: k,
      expected: Math.round(at(k, slope)),
      low: Math.round(at(k, Math.max(slope - se, -MAX_DAILY_GROWTH))),
      high: Math.round(at(k, Math.min(slope + se, MAX_DAILY_GROWTH))),
    };
  });
  const sum = (key: "expected" | "low" | "high") => daily.reduce((a, d) => a + d[key], 0);
  return {
    daily,
    total: { expected: sum("expected"), low: sum("low"), high: sum("high") },
    doublingDays: growing ? Math.round((Math.log(2) / slope) * 10) / 10 : null,
    growing,
  };
}

/** Resource needs per projected case, by syndrome. `source` marks sourced vs assumed ratios. */
export const RESOURCES: Record<string, { item: string; perCase: number; unit: string; source: string }[]> = {
  dengue_like: [
    { item: "Hospital beds", perCase: 0.133, unit: "beds", source: "13.3% admitted: RMU teaching hospitals dengue data, Rawalpindi 2025 (4,545 / 34,122)" },
    { item: "NS1 / IgM test kits", perCase: 1, unit: "kits", source: "one per suspected case (assumption)" },
    { item: "CBC / platelet counts", perCase: 2, unit: "tests", source: "two per case for monitoring (assumption)" },
  ],
  awd: [
    { item: "ORS sachets", perCase: 6, unit: "sachets", source: "assumption" },
    { item: "IV fluid courses (severe dehydration)", perCase: 0.2, unit: "courses", source: "assumption" },
    { item: "Cholera rapid tests", perCase: 1, unit: "tests", source: "one per suspected case (assumption)" },
  ],
  typhoid_like: [
    { item: "Blood cultures", perCase: 1, unit: "cultures", source: "assumption" },
    { item: "Hospital beds", perCase: 0.15, unit: "beds", source: "assumption" },
  ],
  ili: [{ item: "Respiratory swabs", perCase: 0.3, unit: "swabs", source: "sentinel sampling (assumption)" }],
  sari: [
    { item: "Hospital beds", perCase: 1, unit: "beds", source: "SARI implies admission (case definition)" },
    { item: "Oxygen-capable beds", perCase: 0.3, unit: "beds", source: "assumption" },
  ],
  jaundice: [{ item: "Hepatitis A/E serology", perCase: 1, unit: "tests", source: "assumption" }],
  measles_like: [
    { item: "Isolation spaces", perCase: 1, unit: "spaces", source: "assumption" },
    { item: "Measles IgM tests", perCase: 1, unit: "tests", source: "assumption" },
  ],
  malaria_like: [{ item: "Malaria rapid tests", perCase: 1, unit: "tests", source: "assumption" }],
  bloody_diarrhoea: [{ item: "Stool cultures", perCase: 1, unit: "cultures", source: "assumption" }],
};

export function resourceNeeds(syndrome: string, p: Projection) {
  return (RESOURCES[syndrome] ?? []).map((r) => ({
    ...r,
    expected: Math.ceil(r.perCase * p.total.expected),
    low: Math.ceil(r.perCase * p.total.low),
    high: Math.ceil(r.perCase * p.total.high),
  }));
}
