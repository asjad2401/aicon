/**
 * Evaluates AI syndrome tagging (the input to the district early-warning network).
 * Runs the real intake extraction over eval/syndrome-cases.json → per-syndrome precision/recall.
 * Output: eval/syndrome-results.json
 * Usage: npx tsx --conditions=react-server --env-file=.env.local --tsconfig tsconfig.json eval/run-syndromes.mts
 */
import { readFile, writeFile } from "node:fs/promises";
import { extractIntake } from "@/lib/ai/intake";
import { SYNDROME_IDS } from "@/lib/surveillance/config";

type Case = { id: string; lang: string; text: string; expected: string[] };
const { cases } = JSON.parse(await readFile("eval/syndrome-cases.json", "utf8")) as { cases: Case[] };

const rows: (Case & { got: string[]; error?: string })[] = [];
const queue = [...cases];
await Promise.all(Array.from({ length: 3 }, async () => {
  while (queue.length) {
    const c = queue.shift()!;
    try {
      const { data } = await extractIntake({ kind: "text", text: c.text });
      rows.push({ ...c, got: data.syndromes });
    } catch (err) {
      rows.push({ ...c, got: [], error: String(err).slice(0, 120) });
    }
  }
}));
rows.sort((a, b) => a.id.localeCompare(b.id));
const ok = rows.filter((r) => !r.error);

const per = Object.fromEntries(SYNDROME_IDS.map((s) => {
  const tp = ok.filter((r) => r.expected.includes(s) && r.got.includes(s)).length;
  const fp = ok.filter((r) => !r.expected.includes(s) && r.got.includes(s)).length;
  const fn = ok.filter((r) => r.expected.includes(s) && !r.got.includes(s)).length;
  return [s, { support: tp + fn, tp, fp, fn, precision: tp + fp ? +(tp / (tp + fp)).toFixed(3) : null, recall: tp + fn ? +(tp / (tp + fn)).toFixed(3) : null }];
}));
const tp = Object.values(per).reduce((a, x) => a + x.tp, 0);
const fp = Object.values(per).reduce((a, x) => a + x.fp, 0);
const fn = Object.values(per).reduce((a, x) => a + x.fn, 0);
const summary = {
  run_at: new Date().toISOString(),
  n: rows.length,
  errors: rows.length - ok.length,
  micro_precision: +(tp / (tp + fp || 1)).toFixed(3),
  micro_recall: +(tp / (tp + fn || 1)).toFixed(3),
  negatives_clean: +(ok.filter((r) => !r.expected.length && !r.got.length).length / ok.filter((r) => !r.expected.length).length).toFixed(3),
  dengue_recall: per.dengue_like.recall,
  per_syndrome: per,
};
await writeFile("eval/syndrome-results.json", JSON.stringify({ summary, results: rows }, null, 2));
console.log(JSON.stringify({ ...summary, per_syndrome: undefined }, null, 1));
for (const r of ok) {
  const miss = r.expected.filter((s) => !r.got.includes(s));
  const extra = r.got.filter((s) => !r.expected.includes(s));
  if (miss.length || extra.length) console.log(`  ${r.id} missed=${miss.join(",") || "-"} extra=${extra.join(",") || "-"} | ${r.text.slice(0, 70)}`);
}
for (const r of rows.filter((x) => x.error)) console.log(`  ${r.id} ERROR ${r.error}`);
