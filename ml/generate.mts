/**
 * Priora Lite: teacher data generation.
 * Gemini (the teacher) writes realistic patient complaints, labelled by construction with
 * SATS discriminators and an OPD department. Output: ml/data/generated.jsonl
 *
 * Usage: npx tsx --conditions=react-server --env-file=.env.local ml/generate.mts
 */
import { appendFile, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { z } from "zod";
import { generateJSON, ThinkingLevel } from "@/lib/ai/client";
import { DISCRIMINATORS, DISCRIMINATOR_IDS } from "@/lib/triage/discriminators";
import { DEPARTMENTS } from "@/lib/routing/departments";

const OUT = "ml/data/generated.jsonl";
const PER_CALL = 25;
const CONCURRENCY = 6;

// Departments a model can route to (Emergency comes from the RED rule; Paediatrics from age).
const ROUTABLE = DEPARTMENTS.filter((d) => d.id !== "emergency" && d.id !== "paediatrics");
const ROUTABLE_IDS = ROUTABLE.map((d) => d.id) as [string, ...string[]];

const Batch = z.object({
  items: z.array(
    z.object({
      text: z.string().describe("What the patient says, in their own words"),
      language: z.enum(["roman_urdu", "english", "urdu"]),
      department: z.enum(ROUTABLE_IDS),
      discriminators: z.array(z.enum(DISCRIMINATOR_IDS)).describe("ALL SATS discriminators this complaint clearly supports"),
    }),
  ),
});

const SYSTEM = `You generate realistic training data: what adult patients (age 12+) say at the entrance of a busy government
hospital OPD in Islamabad/Rawalpindi, Pakistan. Write like real people talk, not like doctors.

Mix of languages in every batch: about 40% Roman Urdu (Urdu in Latin letters, inconsistent spelling like real chat:
"seenay/sine/seene", "dard/dardh"), 30% English (simple, sometimes broken), 30% Urdu script.
Vary: length (3–40 words), age/sex hints, duration, colloquialisms ("dil ghabra raha hai", "chakkar aa rahe hain"),
code-switching, occasional typos, family members speaking for the patient, extra irrelevant detail.
Never copy an example twice; every item must be meaningfully different.

For each item give the OPD department that should see it, and list ALL SATS discriminators the words clearly support
(may be empty). Use only these department ids and discriminator ids.

Departments:
${ROUTABLE.map((d) => `- ${d.id}: ${d.scope}`).join("\n")}

SATS discriminators:
${DISCRIMINATORS.map((d) => `- ${d.id}: ${d.label}: ${d.hint}`).join("\n")}`;

type Job = { key: string; prompt: string };

const jobs: Job[] = [];
for (const d of DISCRIMINATORS) {
  for (const variant of ["typical", "subtle"]) {
    jobs.push({
      key: `${d.id}:${variant}`,
      prompt:
        variant === "typical"
          ? `Write ${PER_CALL} different patient complaints that clearly show "${d.label}" (${d.hint}). Every item must include ${d.id} in its discriminators.`
          : `Write ${PER_CALL} different patient complaints where "${d.label}" (${d.hint}) is present but described indirectly, colloquially, or mixed with other symptoms, the way a worried relative or a low-literacy patient would say it. Every item must include ${d.id} in its discriminators.`,
    });
  }
}
// Non-urgent complaints: the majority of real OPD patients. Each variant pushes a different style.
const NONE_STYLES = [
  "",
  "",
  "Include several that mention a scary-sounding word but are actually mild (e.g. 'thori si saans phoolti hai seerhiyan charhne pe', 'purana halka sar dard').",
  "Make them long and rambling, with irrelevant family or travel details, the way a talkative patient explains.",
  "Make them very short (3–8 words), vague and low-literacy, e.g. 'pait kharab', 'bukhar hai', 'kamzori'.",
  "Focus on follow-ups, repeat prescriptions, test reports to show, chronic but stable problems, and mild symptoms lasting weeks or months.",
  "Mention pain words ('dard', 'pain', 'تکلیف') but clearly mild or chronic, without any SATS discriminator.",
];
for (const dept of ROUTABLE) {
  NONE_STYLES.forEach((style, i) => {
    jobs.push({
      key: `none:${dept.id}:${i}`,
      prompt: `Write ${PER_CALL} different everyday, non-urgent patient complaints for the ${dept.name} department (${dept.scope}). Most should have NO SATS discriminators. ${style}`,
    });
  });
}

// Boost: safety-critical signs need more Urdu-script and Roman-Urdu examples (first model missed Urdu stroke signs).
const CRITICAL = [
  "airway_compromised", "not_breathing", "seizure_current", "burn_facial_inhalation", "hypoglycaemia", "cardiac_arrest",
  "focal_neurology_acute", "chest_pain", "sob_acute", "coughing_blood", "vomiting_fresh_blood", "pregnancy_abdo",
  "poisoning_overdose", "reduced_consciousness",
];
for (const id of CRITICAL) {
  const d = DISCRIMINATORS.find((x) => x.id === id)!;
  for (const lang of ["urdu", "roman_urdu"] as const) {
    jobs.push({
      key: `boost:${id}:${lang}`,
      prompt: `Write ${PER_CALL} different patient complaints, ALL in ${lang === "urdu" ? "Urdu script" : "Roman Urdu"}, that show "${d.label}" (${d.hint}). Use the everyday words ordinary Pakistani families use (e.g. for stroke: فالج، لقوہ، منہ ٹیڑھا، زبان لڑکھڑانا، ایک طرف کمزوری / "falij", "laqwa", "munh tera", "zabaan larkhara rahi"). Mix the patient speaking and a relative speaking. Every item must include ${id} in its discriminators.`,
    });
  }
}

// Hard negatives: same vocabulary, sign absent (e.g. cough without blood, bleeding that has stopped).
for (const d of DISCRIMINATORS) {
  if (d.id === "pain_moderate" || d.id === "pain_severe") continue;
  jobs.push({
    key: `hardneg:${d.id}`,
    prompt: `Write ${PER_CALL} different patient complaints that use words related to "${d.label}" (${d.hint}) but where that sign is clearly NOT present: milder versions, the symptom without the dangerous feature, something that already resolved, a negation, or a worry without the sign (e.g. for coughing blood: "teen din se khansi hai, khoon nahi aata"; for chest pain: "pichle saal seenay mein dard tha, ab theek hai"). Do NOT include ${d.id} in their discriminators; list only signs that genuinely apply (often none).`,
  });
}

const done = new Set<string>();
if (existsSync(OUT)) {
  for (const line of (await readFile(OUT, "utf8")).split("\n").filter(Boolean)) done.add(JSON.parse(line).job);
}
const todo = jobs.filter((j) => !done.has(j.key));
console.log(`${jobs.length} jobs, ${todo.length} remaining`);

let finished = 0;
async function run(job: Job) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data } = await generateJSON({ schema: Batch, system: SYSTEM, contents: job.prompt, temperature: 1, thinking: ThinkingLevel.LOW, timeoutMs: 60_000 });
      const lines = data.items.map((it) => JSON.stringify({ job: job.key, ...it })).join("\n");
      await appendFile(OUT, lines + "\n");
      console.log(`[${++finished}/${todo.length}] ${job.key}: ${data.items.length}`);
      return;
    } catch (err) {
      console.warn(`retry ${job.key}: ${String(err).slice(0, 120)}`);
    }
  }
  console.error(`FAILED ${job.key}`);
}

const queue = [...todo];
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length) await run(queue.shift()!);
}));

const total = (await readFile(OUT, "utf8")).split("\n").filter(Boolean).length;
await writeFile("ml/data/generation-meta.json", JSON.stringify({ teacher: "gemini-2.5-flash", generated_at: new Date().toISOString(), jobs: jobs.length, items: total }, null, 2));
console.log(`done: ${total} items`);
