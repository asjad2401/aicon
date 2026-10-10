import "server-only";
import { z } from "zod";
import { generateJSON, MODELS, ThinkingLevel } from "./client";
import type { Intake } from "./intake";
import { COLOUR_RANK, DISCRIMINATORS, type Colour } from "@/lib/triage/discriminators";
import { FOLLOW_UP_QUESTIONS } from "@/lib/voice/phrases";

/**
 * AI #7: Follow-up planner (the talking kiosk's "what do I still need to know?").
 * Code computes the candidate signs: not yet found AND more urgent than the current colour
 * (so any "yes" could change the triage). The AI picks the one question that fits the
 * complaint best, or decides no question is needed. Never asks when the patient is already RED.
 */

export type FollowUp = { target: string; why: string; question_ur: string; question_en: string };

export async function planFollowUp(intake: Intake, colour: Colour, ctx: { age?: number; sex?: string }): Promise<FollowUp | null> {
  if (colour === "RED") return null;
  const found = new Set(intake.discriminators.map((d) => d.id));
  const candidates = DISCRIMINATORS.filter(
    (d) => !found.has(d.id) && FOLLOW_UP_QUESTIONS[d.id] && COLOUR_RANK[d.level] > COLOUR_RANK[colour],
  );
  if (!candidates.length) return null;

  const ids = candidates.map((d) => d.id) as [string, ...string[]];
  const Schema = z.object({
    ask: z.boolean().describe("true only if one unmentioned sign is genuinely plausible for this complaint and would change urgency"),
    target: z.enum(ids).nullable(),
    why: z.string().describe("Half a sentence for staff: why this question matters for this patient"),
  });

  const { data } = await generateJSON({
    schema: Schema,
    model: MODELS.fastest,
    thinking: ThinkingLevel.MINIMAL,
    timeoutMs: 8_000,
    system: `You are a triage nurse at a Pakistani hospital OPD deciding whether to ask the patient ONE quick yes/no question
before sending them on. Ask only if a sign that the patient has NOT mentioned is genuinely plausible for their complaint
and would make them more urgent. Do not ask about signs unrelated to the complaint. If the complaint is clearly minor and
complete (e.g. an itchy rash for two weeks), do not ask.
Examples: vague chest discomfort → chest_pain; sudden headache or dizziness in an older adult → focal_neurology_acute;
abdominal pain in a woman of child-bearing age → pregnancy_abdo; any burn → burn_major (electrical/large?);
a cut or injury that bled → haemorrhage_uncontrolled; diabetic feeling unwell → hypoglycaemia; cough → coughing_blood or sob_acute.`,
    contents: JSON.stringify({
      patient_said: intake.transcript,
      summary: intake.summary_en,
      age: ctx.age,
      sex: ctx.sex,
      already_found: [...found],
      current_colour: colour,
      candidate_signs: candidates.map((d) => ({ id: d.id, label: d.label, makes_patient: d.level })),
    }),
  });

  if (!data.ask || !data.target) return null;
  const q = FOLLOW_UP_QUESTIONS[data.target];
  return { target: data.target, why: data.why, question_ur: q.ur, question_en: q.en };
}
