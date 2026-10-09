import "server-only";
import { z } from "zod";
import { generateJSON, MODELS, ThinkingLevel } from "./client";

/**
 * AI #3: Document understanding.
 * Phone photo of a paper medical document → typed facts, each with a bounding
 * box on the image so the doctor can verify it against the source in one click.
 */

export const PROMPT_VERSION_DOCUMENTS = "documents-v2";

export const FACT_KINDS = ["diagnosis", "medication", "lab", "allergy", "procedure", "vital", "other"] as const;

export const DocumentSchema = z.object({
  doc_type: z.enum(["lab_report", "prescription", "discharge_summary", "ecg_report", "imaging_report", "referral", "other"]),
  date: z.string().nullable().describe("Document date as YYYY-MM-DD if visible, else null"),
  facility: z.string().nullable().describe("Hospital, clinic or lab name if visible"),
  patient_name: z.string().nullable().describe("Patient name as printed on the document"),
  quality: z.enum(["good", "poor", "unreadable"]).describe("Legibility of the photo"),
  facts: z.array(
    z.object({
      kind: z.enum(FACT_KINDS),
      label: z.string().describe("e.g. 'HbA1c', 'Metformin', 'Type 2 diabetes', 'Penicillin allergy'"),
      value: z.string().nullable().describe("Result or dose, e.g. '8.4', '500 mg twice daily'"),
      unit: z.string().nullable(),
      date: z.string().nullable().describe("Date this fact refers to (YYYY-MM-DD), defaults to document date"),
      flag: z.enum(["high", "low", "abnormal", "normal"]).nullable().describe("Only for lab results with a reference range or abnormal marker"),
      box_2d: z
        .array(z.number().int().min(0).max(1000))
        .length(4)
        .describe("[ymin, xmin, ymax, xmax] of where this fact appears on the image, normalised to 0–1000"),
      confidence: z.number().min(0).max(1),
    }),
  ),
});

export type ExtractedDocument = z.infer<typeof DocumentSchema>;

const SYSTEM = `You read photos of paper medical documents from Pakistani hospitals, clinics and labs:
lab reports, prescriptions (often handwritten), discharge summaries, ECG reports and imaging reports.
Text may be English, Urdu or mixed. Photos may be skewed, folded or poorly lit.

Extract every clinically useful fact: diagnoses, medications (with dose and frequency), lab results
(with units and abnormal flags), allergies, procedures and recorded vitals.

Rules:
- Only extract what is actually written. Never infer or invent values.
- Do not extract patient demographics (name, age, sex, MR number) or doctor/lab names as facts.
- For each fact give box_2d: the region of the image where that fact is written, as
  [ymin, xmin, ymax, xmax] normalised to 0–1000.
- Lower confidence for handwriting or partly illegible text.
- Expand common abbreviations in the label (e.g. "T2DM" → "Type 2 diabetes mellitus", "BD" → "twice daily").
- If the image is not a medical document or is unreadable, set quality accordingly and return no facts.`;

export async function extractDocument(image: { base64: string; mimeType: string }) {
  return generateJSON({
    schema: DocumentSchema,
    system: SYSTEM,
    model: MODELS.fast,
    thinking: ThinkingLevel.MEDIUM,
    timeoutMs: 45_000,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { data: image.base64, mimeType: image.mimeType } },
          { text: "Extract the facts from this medical document." },
        ],
      },
    ],
  });
}
