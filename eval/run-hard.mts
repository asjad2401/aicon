/**
 * Hard evaluation: 100 hand-written cases (eval/hard-cases.json) through every path:
 *  - Gemini pipeline (text), plus 2 extra sampled runs → self-consistency (max colour, disagreement flag)
 *  - Priora Lite (our offline model + red-flag lexicon)
 *  - Hybrid: most urgent of Gemini and Priora Lite
 *  - Voice: 30 cases synthesised to Urdu/English speech with Gemini TTS, run through the real audio path
 * Resumable (eval/hard-results.partial.jsonl). Output: eval/hard-results.json
 * Usage: npx tsx --conditions=react-server --env-file=.env.local --tsconfig tsconfig.json eval/run-hard.mts
 */
import { existsSync } from "node:fs";
import { appendFile, readFile, writeFile } from "node:fs/promises";
import { getAI } from "@/lib/ai/client";
import { extractIntake } from "@/lib/ai/intake";
import { runIntakePipeline } from "@/lib/pipeline";
import { PrioraLite, type LiteModel } from "@/lib/lite/model";
import { redFlags } from "@/lib/lite/redflags";
import { triage } from "@/lib/triage/sats";
import { COLOUR_RANK, type Colour } from "@/lib/triage/discriminators";

type Case = {
  id: string; category: string; lang: string; age: number; sex: string; voice: boolean; text: string;
  expected_colour: Colour; expected_department: string; accept: string[];
};

const PARTIAL = "eval/hard-results.partial.jsonl";
const CONCURRENCY = 2;
const { cases } = JSON.parse(await readFile("eval/hard-cases.json", "utf8")) as { cases: Case[] };
const lite = new PrioraLite(JSON.parse(await readFile("ml/model/priora-lite.json", "utf8")) as LiteModel);
const ai = getAI();

const maxColour = (cs: Colour[]) => cs.reduce((a, b) => (COLOUR_RANK[b] > COLOUR_RANK[a] ? b : a), "GREEN" as Colour);
const verdict = (got: Colour, exp: Colour) => (got === exp ? "correct" : COLOUR_RANK[got] < COLOUR_RANK[exp] ? "under" : "over");
const withTimeout = <T,>(p: Promise<T>, ms = 120_000) =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);

/** 16-bit mono PCM → WAV container. */
function wav(pcm: Buffer, rate = 24000) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8); h.write("fmt ", 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

async function speech(c: Case) {
  const path = `eval/audio/${c.id}.wav`;
  if (existsSync(path)) return readFile(path);
  const voice = c.sex === "female" ? "Kore" : "Charon";
  const r = await ai.models.generateContent({
    model: "gemini-2.5-flash-tts",
    contents: [{ role: "user", parts: [{ text: `Say this in ${c.lang === "english" ? "English with a Pakistani accent" : "Urdu"}, like a worried person at a hospital reception: ${c.text}` }] }],
    config: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
  });
  const data = r.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData?.data;
  if (!data) throw new Error("no audio");
  const file = wav(Buffer.from(data, "base64"));
  await writeFile(path, file);
  return file;
}

async function runCase(c: Case) {
  const ctx = { age: c.age, sex: c.sex };
  const row: Record<string, unknown> = { ...c };

  // 1. Gemini pipeline (text)
  const g = await withTimeout(runIntakePipeline({ kind: "text", text: c.text }, ctx));
  row.gemini = {
    colour: g.triage.colour, verdict: verdict(g.triage.colour, c.expected_colour), department: g.routing.department,
    dept_ok: g.routing.department === c.expected_department || c.accept.includes(g.routing.department),
    signs: g.intake.discriminators.map((d) => d.id), offline: g.offline,
  };

  // 2. Self-consistency: two more sampled extractions; escalate to the most urgent colour
  const samples: Colour[] = [g.triage.colour];
  for (let i = 0; i < 2; i++) {
    try {
      const { data } = await withTimeout(extractIntake({ kind: "text", text: c.text }, ctx, { temperature: 0.8 }));
      samples.push(triage({ discriminatorIds: data.discriminators.map((d) => d.id), painScore: data.pain_score ?? undefined, age: c.age, uncertain: data.confidence < 0.6 }).colour);
    } catch { /* a failed sample just isn't counted */ }
  }
  const sc = maxColour(samples);
  row.consistency = { samples, colour: sc, verdict: verdict(sc, c.expected_colour), disagreement: new Set(samples).size > 1 };

  // 3. Priora Lite (offline model + lexicon)
  const p = lite.predict(c.text);
  const ids = [...new Set([...p.discriminators.map((d) => d.id), ...redFlags(c.text).map((f) => f.id)])];
  const lc = triage({ discriminatorIds: ids, age: c.age, uncertain: p.nearMiss > 0 && ids.length === 0 }).colour;
  row.lite = { colour: lc, verdict: verdict(lc, c.expected_colour), signs: ids };

  // 4. Hybrid: most urgent of Gemini and Priora Lite
  const hc = maxColour([g.triage.colour, lc]);
  row.hybrid = { colour: hc, verdict: verdict(hc, c.expected_colour) };

  // 5. Voice (real synthesised speech through the audio path)
  if (c.voice) {
    try {
      const audio = await speech(c);
      const v = await withTimeout(runIntakePipeline({ kind: "audio", base64: audio.toString("base64"), mimeType: "audio/wav" }, ctx));
      row.voice = {
        colour: v.triage.colour, verdict: verdict(v.triage.colour, c.expected_colour), transcript: v.intake.transcript,
        department: v.routing.department, dept_ok: v.routing.department === c.expected_department || c.accept.includes(v.routing.department),
      };
    } catch (err) {
      row.voice = { error: String(err).slice(0, 160) };
    }
  }
  return row;
}

const done = new Map<string, Record<string, unknown>>();
if (existsSync(PARTIAL)) for (const l of (await readFile(PARTIAL, "utf8")).split("\n").filter(Boolean)) { const r = JSON.parse(l); done.set(r.id, r); }
const queue = cases.filter((c) => !done.has(c.id));
console.log(`${cases.length} cases, ${queue.length} to run`);
let n = 0;
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length) {
    const c = queue.shift()!;
    try {
      const row = await runCase(c);
      done.set(c.id, row);
      await appendFile(PARTIAL, JSON.stringify(row) + "\n");
      const gm = row.gemini as { verdict: string; colour: string };
      console.log(`[${++n}] ${c.id} ${c.expected_colour} gemini=${gm.colour}(${gm.verdict}) lite=${(row.lite as { colour: string }).colour}${row.voice ? ` voice=${(row.voice as { colour?: string }).colour ?? "ERR"}` : ""}`);
    } catch (err) {
      console.log(`[x] ${c.id} failed: ${String(err).slice(0, 120)}`);
    }
  }
}));

// ── Summary ──────────────────────────────────────────────────────────────
/* eslint-disable @typescript-eslint/no-explicit-any -- summary over loosely typed result rows (dev script) */
const rows = cases.map((c) => done.get(c.id)).filter(Boolean) as Record<string, any>[];
const rate = (xs: any[], key: string, v: string) => (xs.length ? +(xs.filter((r) => r[key]?.verdict === v).length / xs.length).toFixed(3) : null);
const sys = (xs: any[], key: string) => ({ n: xs.filter((r) => r[key]?.verdict).length, accuracy: rate(xs, key, "correct"), under_triage: rate(xs, key, "under"), over_triage: rate(xs, key, "over") });
const voiceRows = rows.filter((r) => r.voice?.verdict);
const summary = {
  run_at: new Date().toISOString(),
  n: rows.length,
  systems: {
    gemini: { ...sys(rows, "gemini"), department_acceptable: +(rows.filter((r) => r.gemini.dept_ok).length / rows.length).toFixed(3) },
    gemini_self_consistency: { ...sys(rows, "consistency"), disagreement_rate: +(rows.filter((r) => r.consistency.disagreement).length / rows.length).toFixed(3) },
    priora_lite: sys(rows, "lite"),
    hybrid: sys(rows, "hybrid"),
  },
  voice: {
    n: voiceRows.length,
    voice: { ...sys(voiceRows, "voice"), department_acceptable: voiceRows.length ? +(voiceRows.filter((r) => r.voice.dept_ok).length / voiceRows.length).toFixed(3) : null },
    same_cases_text: sys(voiceRows, "gemini"),
    errors: rows.filter((r) => r.voice?.error).length,
  },
  by_category: Object.fromEntries([...new Set(rows.map((r) => r.category))].map((cat) => {
    const xs = rows.filter((r) => r.category === cat);
    return [cat, { n: xs.length, gemini: rate(xs, "gemini", "correct"), lite: rate(xs, "lite", "correct"), gemini_under: rate(xs, "gemini", "under") }];
  })),
  by_language: Object.fromEntries([...new Set(rows.map((r) => r.lang))].map((lang) => {
    const xs = rows.filter((r) => r.lang === lang);
    return [lang, { n: xs.length, gemini: rate(xs, "gemini", "correct"), lite: rate(xs, "lite", "correct") }];
  })),
  disagreements_that_caught_under_triage: rows.filter((r) => r.gemini.verdict === "under" && r.consistency.verdict !== "under").map((r) => r.id),
};
await writeFile("eval/hard-results.json", JSON.stringify({ summary, results: rows }, null, 2));
console.log(JSON.stringify(summary, null, 2));
