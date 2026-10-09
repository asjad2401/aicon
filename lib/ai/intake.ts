import "server-only";
import { z } from "zod";
import { generateJSON, ThinkingLevel } from "./client";
import { DISCRIMINATORS, DISCRIMINATOR_IDS } from "@/lib/triage/discriminators";

/**
 * AI #1: Intake extraction.
 * Patient speech (audio) or text in Urdu / Roman Urdu / English → structured
 * clinical findings + SATS discriminators, each backed by the patient's own words.
 * The model only extracts; the SATS engine assigns the colour.
 */

export const PROMPT_VERSION_INTAKE = "intake-v1";

export const IntakeSchema = z.object({
  transcript: z.string().describe("Verbatim transcript of what the patient said, in the original language and script"),
  language: z.enum(["urdu", "roman_urdu", "english", "mixed", "other"]),
  chief_complaint: z.string().describe("Main complaint in plain English, max 8 words"),
  summary_en: z.string().describe("One or two sentence clinical summary in English"),
  summary_ur: z.string().describe("The same summary in simple Urdu script, for the patient to confirm"),
  symptoms: z.array(
    z.object({
      name: z.string().describe("Symptom in English"),
      duration: z.string().nullable(),
      severity: z.enum(["mild", "moderate", "severe"]).nullable(),
      body_site: z.string().nullable(),
    }),
  ),
  discriminators: z.array(
    z.object({
      id: z.enum(DISCRIMINATOR_IDS),
      evidence: z.string().describe("The patient's exact words that support this discriminator"),
    }),
  ),
  pain_score: z.number().min(0).max(10).nullable().describe("Only if the patient states or clearly implies a pain level"),
  pregnant: z.boolean().nullable(),
  trauma: z.boolean().nullable().describe("True if the complaint follows an injury or accident"),
  confidence: z.number().min(0).max(1).describe("How confident you are that the extraction is complete and correct"),
  clarifying_question: z
    .string()
    .nullable()
    .describe("If something important is ambiguous, one short follow-up question in simple Urdu; else null"),
});

export type Intake = z.infer<typeof IntakeSchema>;

export const INTAKE_SYSTEM = `You are the intake assistant at the entrance of a busy government hospital OPD in Pakistan.
Patients speak or type in Urdu, Roman Urdu (Urdu in Latin letters), English, or a mix. Many have low literacy.

Your job is EXTRACTION ONLY. You do not diagnose and you do not assign a triage colour.

1. Transcribe exactly what the patient said in the original language.
2. Extract symptoms, duration, severity and body site in English.
3. Select SATS discriminators ONLY from the list below, and ONLY when the patient's words support them.
   For each, quote the supporting words as evidence. Do not infer signs the patient did not describe.
   When the description clearly matches a discriminator, include it even if phrased colloquially
   (e.g. "seenay mein dard" = chest pain, "saans nahi aa rahi" = shortness of breath, "ulti mein khoon" = vomiting blood).
4. If the patient gives a pain level (numeric or words like "bardasht se bahar" = unbearable), set pain_score.
5. Set confidence below 0.6 if the input is unclear, very short, or contradictory.

SATS discriminators (id: label: when it applies):
${DISCRIMINATORS.map((d) => `- ${d.id}: ${d.label}: ${d.hint}`).join("\n")}`;

export type IntakeInput =
  | { kind: "text"; text: string }
  | { kind: "audio"; base64: string; mimeType: string };

export async function extractIntake(
  input: IntakeInput,
  context: { age?: number; sex?: string } = {},
) {
  const ctx = [
    context.age != null && `Age: ${context.age}`,
    context.sex && `Sex: ${context.sex}`,
  ]
    .filter(Boolean)
    .join(", ");

  const parts =
    input.kind === "text"
      ? [{ text: `${ctx ? `[${ctx}]\n` : ""}Patient says: ${input.text}` }]
      : [
          { text: `${ctx ? `[${ctx}]\n` : ""}The patient's spoken description follows.` },
          { inlineData: { data: input.base64, mimeType: input.mimeType } },
        ];

  return generateJSON({
    schema: IntakeSchema,
    system: INTAKE_SYSTEM,
    contents: [{ role: "user", parts }],
    thinking: ThinkingLevel.LOW,
  });
}
