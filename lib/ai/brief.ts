import "server-only";
import { z } from "zod";
import { generateJSON, MODELS, ThinkingLevel } from "./client";

/**
 * AI #4: Complaint-aware pre-consultation brief.
 * All extracted facts (with IDs) + today's complaint → a short brief where every
 * line cites the facts it is based on. Lines with no valid citation are dropped
 * server-side, so the doctor only ever sees claims traceable to a source document.
 * Orientation only: the doctor's own examination always follows.
 */

export const PROMPT_VERSION_BRIEF = "brief-v1";

const Item = z.object({
  text: z.string().describe("One short clinical line"),
  fact_ids: z.array(z.number().int()).min(1).describe("IDs of the facts this line is based on"),
});

export const BriefSchema = z.object({
  headline: z.string().describe("One sentence: who this patient is clinically, in light of today's complaint"),
  relevant_to_today: z.array(Item).describe("The 2–5 facts that matter most for today's complaint, most important first"),
  conditions: z.array(Item),
  medications: z.array(Item),
  allergies: z.array(Item),
  trends: z.array(Item).describe("Changes over time, e.g. a lab value rising across reports"),
  gaps: z.array(Item).describe("Recommended follow-ups noted in old reports that have no later result on file, or conflicts between reports"),
});

export type Brief = z.infer<typeof BriefSchema>;
export type BriefSection = Exclude<keyof Brief, "headline">;

export type BriefFact = {
  id: number;
  kind: string;
  label: string;
  value: string | null;
  unit: string | null;
  date: string | null;
  flag: string | null;
  source: string;
};

const SYSTEM = `You prepare a pre-consultation brief for a doctor in a busy Pakistani government OPD.
The doctor has about 3 minutes. You receive facts extracted from the patient's old paper reports,
each with a numeric id, and today's complaint.

Rules:
- Use ONLY the facts provided. Every line must cite the ids of the facts it is based on.
- Never add diagnoses, interpretations or recommendations that are not supported by the facts.
- Prioritise what is relevant to TODAY's complaint (e.g. for chest pain: prior ECG findings, cardiac
  risk factors, cardiac medications, antiplatelets, allergies).
- Trends: when the same test appears on multiple dates, state the direction with values and years.
- Gaps: follow-ups recommended in old reports (e.g. "echo advised") with no later result on file.
- Keep lines short and clinical. Use the patient's facts' exact values.
- Return empty arrays for sections with nothing to say.`;

export async function generateBrief(input: {
  complaint: string;
  summary: string;
  age?: number | null;
  sex?: string | null;
  facts: BriefFact[];
}) {
  const { data, model } = await generateJSON({
    schema: BriefSchema,
    system: SYSTEM,
    model: MODELS.fast,
    thinking: ThinkingLevel.MEDIUM,
    timeoutMs: 45_000,
    contents: JSON.stringify({
      today: { complaint: input.complaint, summary: input.summary, age: input.age, sex: input.sex },
      facts: input.facts,
    }),
  });

  // Citation guard: drop any line whose citations don't point at real facts.
  const valid = new Set(input.facts.map((f) => f.id));
  let dropped = 0;
  const clean = (items: z.infer<typeof Item>[]) =>
    items
      .map((item) => ({ ...item, fact_ids: item.fact_ids.filter((id) => valid.has(id)) }))
      .filter((item) => {
        if (item.fact_ids.length) return true;
        dropped++;
        return false;
      });

  const brief: Brief = {
    headline: data.headline,
    relevant_to_today: clean(data.relevant_to_today),
    conditions: clean(data.conditions),
    medications: clean(data.medications),
    allergies: clean(data.allergies),
    trends: clean(data.trends),
    gaps: clean(data.gaps),
  };
  return { brief, dropped, model };
}
