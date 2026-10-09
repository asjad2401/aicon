/**
 * Runs the real intake → SATS → routing pipeline over eval/vignettes.json
 * and writes eval/results.json.
 * Usage: npm run eval            (all cases)
 *        npm run eval -- --retry (re-run only cases that errored last time)
 */
import { readFile, writeFile } from "node:fs/promises";
import { runIntakePipeline } from "@/lib/pipeline";
import { COLOUR_RANK, type Colour } from "@/lib/triage/discriminators";

type Case = {
  id: string;
  lang: string;
  age: number;
  sex: string;
  text: string;
  expected_colour: Colour;
  expected_department: string;
  accept: string[];
};

const RETRY = process.argv.includes("--retry");
const CONCURRENCY = RETRY ? 2 : 4;
const TIMEOUT_MS = RETRY ? 120_000 : 60_000;

const { cases } = JSON.parse(await readFile("eval/vignettes.json", "utf8")) as { cases: Case[] };

type Result = Awaited<ReturnType<typeof runCase>>;
const previous: Result[] = RETRY
  ? (JSON.parse(await readFile("eval/results.json", "utf8")) as { results: Result[] }).results
  : [];
const toRun = RETRY ? cases.filter((c) => previous.some((r) => r.id === c.id && "error" in r)) : cases;
console.log(`Running ${toRun.length} case(s)${RETRY ? " (retry)" : ""}…`);

function withTimeout<T>(p: Promise<T>) {
  return Promise.race([
    p,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS)),
  ]);
}

async function runCase(c: Case) {
  try {
    const r = await withTimeout(runIntakePipeline({ kind: "text", text: c.text }, { age: c.age, sex: c.sex }));
    const got = r.triage.colour;
    const diff = COLOUR_RANK[got] - COLOUR_RANK[c.expected_colour];
    const dept = r.routing.department;
    return {
      ...c,
      got_colour: got,
      triage: diff === 0 ? "correct" : diff < 0 ? "under" : "over",
      got_department: dept,
      dept_top1: dept === c.expected_department,
      dept_acceptable: dept === c.expected_department || c.accept.includes(dept),
      discriminators: r.intake.discriminators,
      reasons: r.triage.reasons.map((x) => x.text),
      routing_reasons: r.routing.reasons,
      ms: r.ms,
    };
  } catch (err) {
    return { ...c, error: String(err) };
  }
}

const results: Result[] = previous.filter((r) => !toRun.some((c) => c.id === r.id));
const queue = [...toRun];
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) {
      const c = queue.shift()!;
      const r = await runCase(c);
      results.push(r);
      const line =
        "error" in r
          ? `ERROR ${r.error}`
          : `${r.triage.padEnd(7)} ${c.expected_colour}→${r.got_colour}  dept ${r.dept_acceptable ? "ok " : "BAD"} ${c.expected_department}→${r.got_department}`;
      console.log(`${c.id} [${c.lang}] ${line}`);
    }
  }),
);

results.sort((a, b) => a.id.localeCompare(b.id));
const ok = results.filter((r) => !("error" in r)) as Extract<(typeof results)[number], { triage: string }>[];
const pct = (n: number) => Math.round((n / ok.length) * 1000) / 10;
const summary = {
  run_at: new Date().toISOString(),
  n: cases.length,
  completed: ok.length,
  errors: results.length - ok.length,
  triage_accuracy: pct(ok.filter((r) => r.triage === "correct").length),
  under_triage_rate: pct(ok.filter((r) => r.triage === "under").length),
  over_triage_rate: pct(ok.filter((r) => r.triage === "over").length),
  dept_top1_accuracy: pct(ok.filter((r) => r.dept_top1).length),
  dept_acceptable_accuracy: pct(ok.filter((r) => r.dept_acceptable).length),
  median_ms: ok.map((r) => r.ms).sort((a, b) => a - b)[Math.floor(ok.length / 2)],
};

await writeFile("eval/results.json", JSON.stringify({ summary, results }, null, 2));
console.log("\n", summary);
