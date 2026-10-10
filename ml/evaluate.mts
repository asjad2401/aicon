/**
 * Evaluates Priora Lite (our trained model) with the real SATS engine.
 *  1. Parity: TypeScript inference vs Python probabilities.
 *  2. Held-out synthetic test split: discriminators + resulting SATS colour.
 *  3. The 28 hand-written evaluation vignettes (independent of the teacher), vs Gemini's results.
 * Usage: npx tsx --tsconfig tsconfig.json ml/evaluate.mts
 */
import { readFile, writeFile } from "node:fs/promises";
import { PrioraLite, type LiteModel } from "@/lib/lite/model";
import { redFlags } from "@/lib/lite/redflags";
import { triage } from "@/lib/triage/sats";
import { COLOUR_RANK, type Colour } from "@/lib/triage/discriminators";

const model = JSON.parse(await readFile("ml/model/priora-lite.json", "utf8")) as LiteModel;
const lite = new PrioraLite(model);

// 1. Parity
const parity = JSON.parse(await readFile("ml/model/parity.json", "utf8")) as { text: string; disc: number[]; dept: number[] }[];
let maxDiff = 0;
for (const p of parity) {
  const { disc, dept } = lite.probabilities(p.text);
  for (let k = 0; k < disc.length; k++) maxDiff = Math.max(maxDiff, Math.abs(disc[k] - p.disc[k]));
  for (let k = 0; k < dept.length; k++) maxDiff = Math.max(maxDiff, Math.abs(dept[k] - p.dept[k]));
}
// Weights are pruned (|w| < 0.02) and rounded on export, so small differences are expected.
console.log(`parity: max |Δp| = ${maxDiff.toFixed(4)} over ${parity.length} items`);

const colourOf = (ids: string[], age?: number) => triage({ discriminatorIds: ids, age }).colour;
const cmp = (got: Colour, exp: Colour) => (got === exp ? "correct" : COLOUR_RANK[got] < COLOUR_RANK[exp] ? "under" : "over");

type Variant = "model" | "lexicon" | "model+lexicon";
const VARIANTS: Variant[] = ["model", "lexicon", "model+lexicon"];
const PAIN = new Set(["pain_moderate", "pain_severe"]);
function signs(text: string, v: Variant) {
  const ids = new Set<string>();
  if (v !== "lexicon") for (const d of lite.predict(text).discriminators) ids.add(d.id);
  if (v !== "model") for (const h of redFlags(text)) ids.add(h.id);
  return ids;
}

// 2. Held-out synthetic test split (never seen while training or writing the lexicon)
const test = (await readFile("ml/data/test.jsonl", "utf8")).split("\n").filter(Boolean).map((l) => JSON.parse(l));
const heldOut: Record<string, unknown> = { n: test.length };
for (const v of VARIANTS) {
  let tp = 0, fp = 0, fn = 0;
  const colourRes = { correct: 0, under: 0, over: 0 };
  for (const t of test) {
    const got = signs(t.text, v);
    const exp = new Set<string>(t.discriminators.filter((d: string) => !PAIN.has(d)));
    for (const g of got) { if (exp.has(g)) tp++; else fp++; }
    for (const e of exp) if (!got.has(e)) fn++;
    colourRes[cmp(colourOf([...got]), colourOf([...exp]))]++;
  }
  heldOut[v] = {
    discriminator_precision: +(tp / (tp + fp || 1)).toFixed(3),
    discriminator_recall: +(tp / (tp + fn || 1)).toFixed(3),
    colour_accuracy: +(colourRes.correct / test.length).toFixed(3),
    under_triage_rate: +(colourRes.under / test.length).toFixed(3),
    over_triage_rate: +(colourRes.over / test.length).toFixed(3),
  };
}
heldOut.department_accuracy = +(test.filter((t: { text: string; department: string }) => lite.predict(t.text).department === t.department).length / test.length).toFixed(3);
console.log("held-out synthetic (pain intensity excluded: comes from the kiosk pain scale offline):");
for (const v of VARIANTS) console.log(`  ${v.padEnd(14)}`, JSON.stringify(heldOut[v]));
console.log("  department accuracy", heldOut.department_accuracy);

// 3. Hand-written vignettes (same set Gemini is evaluated on)
const { cases } = JSON.parse(await readFile("eval/vignettes.json", "utf8"));
const gemini = JSON.parse(await readFile("eval/results.json", "utf8"));
const rows = cases.map((c: { id: string; text: string; age: number; lang: string; expected_colour: Colour; expected_department: string; accept: string[] }) => {
  const pred = lite.predict(c.text);
  const ids = [...signs(c.text, "model+lexicon")];
  const result = triage({ discriminatorIds: ids, age: c.age, uncertain: pred.nearMiss > 0 && ids.length === 0 });
  const dept = c.age < 12 ? "paediatrics" : result.colour === "RED" ? "emergency" : pred.department;
  const g = gemini.results.find((r: { id: string }) => r.id === c.id);
  return {
    id: c.id,
    lang: c.lang,
    text: c.text,
    expected_colour: c.expected_colour,
    lite_colour: result.colour,
    lite_triage: cmp(result.colour, c.expected_colour),
    lite_discriminators: ids,
    lite_department: dept,
    lite_dept_acceptable: dept === c.expected_department || c.accept.includes(dept),
    gemini_colour: g?.got_colour,
    gemini_triage: g?.triage,
  };
});
const n = rows.length;
const vignettes = {
  n,
  lite: {
    colour_accuracy: +(rows.filter((r: { lite_triage: string }) => r.lite_triage === "correct").length / n).toFixed(3),
    under_triage_rate: +(rows.filter((r: { lite_triage: string }) => r.lite_triage === "under").length / n).toFixed(3),
    over_triage_rate: +(rows.filter((r: { lite_triage: string }) => r.lite_triage === "over").length / n).toFixed(3),
    department_acceptable: +(rows.filter((r: { lite_dept_acceptable: boolean }) => r.lite_dept_acceptable).length / n).toFixed(3),
  },
  gemini: {
    colour_accuracy: gemini.summary.triage_accuracy / 100,
    under_triage_rate: gemini.summary.under_triage_rate / 100,
    department_acceptable: gemini.summary.dept_acceptable_accuracy / 100,
  },
};
console.log("vignettes:", JSON.stringify(vignettes));
for (const r of rows) if (r.lite_triage !== "correct" || !r.lite_dept_acceptable)
  console.log(`  ${r.id} [${r.lang}] ${r.expected_colour}→${r.lite_colour} (${r.lite_triage}) dept ${r.lite_department}${r.lite_dept_acceptable ? "" : " ✗"} | ${r.lite_discriminators.join(",") || "none"} | ${r.text.slice(0, 60)}`);

// Latency (CPU, single thread)
const t0 = performance.now();
for (let i = 0; i < 200; i++) lite.predict(cases[i % n].text);
const latencyMs = +((performance.now() - t0) / 200).toFixed(2);
console.log(`latency: ${latencyMs} ms per patient`);

await writeFile("ml/model/eval.json", JSON.stringify({ evaluated_at: new Date().toISOString(), parity_max_abs_diff: +maxDiff.toFixed(4), held_out: heldOut, vignettes, latency_ms: latencyMs, rows }, null, 2));
