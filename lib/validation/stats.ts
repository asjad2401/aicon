import { COLOUR_RANK, type Colour } from "@/lib/triage/discriminators";

/** Agreement statistics for a prospective triage validation (nurse vs SATS system). */

export const ORDER: Colour[] = ["RED", "ORANGE", "YELLOW", "GREEN"];

export type Pair = { nurse: Colour; system: Colour };

export function confusion(pairs: Pair[]) {
  const m = ORDER.map(() => ORDER.map(() => 0));
  for (const p of pairs) m[ORDER.indexOf(p.nurse)][ORDER.indexOf(p.system)]++;
  return m; // rows = nurse, cols = system
}

/**
 * Cohen's kappa. `weighted` uses linear weights for ordered categories
 * (RED↔GREEN disagreement counts more than RED↔ORANGE).
 */
export function kappa(pairs: Pair[], weighted = false) {
  const n = pairs.length;
  if (!n) return null;
  const k = ORDER.length;
  const m = confusion(pairs);
  const rows = m.map((r) => r.reduce((a, b) => a + b, 0));
  const cols = ORDER.map((_, j) => m.reduce((a, r) => a + r[j], 0));
  const w = (i: number, j: number) => (weighted ? 1 - Math.abs(i - j) / (k - 1) : i === j ? 1 : 0);
  let po = 0;
  let pe = 0;
  for (let i = 0; i < k; i++)
    for (let j = 0; j < k; j++) {
      po += (w(i, j) * m[i][j]) / n;
      pe += (w(i, j) * rows[i] * cols[j]) / (n * n);
    }
  return pe === 1 ? 1 : (po - pe) / (1 - pe);
}

/** Landis & Koch interpretation. */
export function kappaLabel(k: number | null) {
  if (k == null) return "n/a";
  if (k > 0.8) return "almost perfect";
  if (k > 0.6) return "substantial";
  if (k > 0.4) return "moderate";
  if (k > 0.2) return "fair";
  return "slight";
}

export function triageAgreement(pairs: Pair[]) {
  const n = pairs.length;
  const agree = pairs.filter((p) => p.nurse === p.system).length;
  // System less urgent than the nurse = potential under-triage by the system.
  const under = pairs.filter((p) => COLOUR_RANK[p.system] < COLOUR_RANK[p.nurse]).length;
  const over = pairs.filter((p) => COLOUR_RANK[p.system] > COLOUR_RANK[p.nurse]).length;
  return {
    n,
    agreement: n ? agree / n : null,
    kappa: kappa(pairs),
    weightedKappa: kappa(pairs, true),
    systemUnderTriage: n ? under / n : null,
    systemOverTriage: n ? over / n : null,
    matrix: confusion(pairs),
  };
}
