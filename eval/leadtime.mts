/**
 * Detection lead-time study (Priora early warning vs lab-confirmed weekly reporting).
 * Writes eval/leadtime.json: the default scenario plus one-at-a-time sensitivity analysis.
 * Usage: npx tsx --tsconfig tsconfig.json eval/leadtime.mts
 */
import { writeFile } from "node:fs/promises";
import { DEFAULT_LEADTIME, runLeadTime, type LeadTimeParams } from "@/lib/surveillance/leadtime";

const params: LeadTimeParams = { ...DEFAULT_LEADTIME, scenarios: 1000 };
const { results: _results, ...summary } = runLeadTime(params);
void _results;

const sweep: Record<string, [number, number[]]> = {
  coverage: [DEFAULT_LEADTIME.coverage, [0.2, 0.4, 0.6, 0.8]],
  sensitivity: [DEFAULT_LEADTIME.sensitivity, [0.6, 0.75, 0.85, 0.95]],
  testingRate: [DEFAULT_LEADTIME.testingRate, [0.15, 0.3, 0.5, 0.8]],
  reportCompliance: [DEFAULT_LEADTIME.reportCompliance, [0.5, 0.75, 1]],
};
const sensitivity = Object.fromEntries(
  Object.entries(sweep).map(([key, [, values]]) => [
    key,
    values.map((v) => {
      const s = runLeadTime({ ...params, scenarios: 400, [key]: v });
      return { value: v, medianLeadDays: s.medianLeadDays, prioraWithin14: +s.prioraDetectedWithin14.toFixed(3), todayWithin14: +s.todayDetectedWithin14.toFixed(3) };
    }),
  ]),
);

await writeFile("eval/leadtime.json", JSON.stringify({ run_at: new Date().toISOString(), params, summary, sensitivity }, null, 2));
console.log(JSON.stringify({ ...summary, leadHistogram: undefined }, null, 1));
console.log(JSON.stringify(sensitivity));
