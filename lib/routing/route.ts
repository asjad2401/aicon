import "server-only";
import { z } from "zod";
import { generateJSON, MODELS, ThinkingLevel } from "@/lib/ai/client";
import type { Intake } from "@/lib/ai/intake";
import type { Colour } from "@/lib/triage/discriminators";
import { DEPARTMENTS, DEPARTMENT_IDS, type DepartmentId } from "./departments";

/**
 * AI #2: Department routing.
 * Hard rules first (safety and age), then AI maps the findings (+ known history)
 * to an OPD department. Low confidence falls back to Medical OPD with nurse review.
 */

export const PROMPT_VERSION_ROUTING = "routing-v1";
const MIN_CONFIDENCE = 0.6;

const RoutingSchema = z.object({
  department: z.enum(DEPARTMENT_IDS),
  confidence: z.number().min(0).max(1),
  reasons: z.array(z.string()).describe("1–3 short reasons, citing the findings"),
  alternatives: z.array(z.enum(DEPARTMENT_IDS)).max(2),
});

export type Routing = {
  department: DepartmentId;
  confidence: number;
  reasons: string[];
  alternatives: DepartmentId[];
  source: "rule" | "ai" | "ai_low_confidence";
  /** Department to see after Emergency stabilises a RED patient. */
  specialty?: DepartmentId;
};

const SYSTEM = `You route patients to the correct OPD department in a Pakistani government hospital.
Choose exactly one department from the list, based on the findings. Use known medical history if provided
(e.g. a known heart patient with chest pain → cardiology). Prefer the department that can definitively manage
the main complaint. If unsure, choose medical and give low confidence.

Departments (id: name: scope):
${DEPARTMENTS.filter((d) => d.id !== "emergency" && d.id !== "paediatrics")
  .map((d) => `- ${d.id}: ${d.name}: ${d.scope}`)
  .join("\n")}`;

export async function routePatient(args: {
  intake: Intake;
  colour: Colour;
  age?: number;
  sex?: string;
  knownHistory?: string[];
}): Promise<Routing> {
  const { intake, colour, age, sex, knownHistory = [] } = args;

  if (age != null && age < 12) {
    return { department: "paediatrics", confidence: 1, reasons: ["Patient is under 12"], alternatives: [], source: "rule" };
  }

  const { data } = await generateJSON({
    schema: RoutingSchema,
    system: SYSTEM,
    model: MODELS.fastest,
    thinking: ThinkingLevel.MINIMAL,
    contents: JSON.stringify({
      age,
      sex,
      chief_complaint: intake.chief_complaint,
      summary: intake.summary_en,
      symptoms: intake.symptoms,
      pregnant: intake.pregnant,
      trauma: intake.trauma,
      known_history: knownHistory,
    }),
  });

  const lowConfidence = data.confidence < MIN_CONFIDENCE;
  const specialty: DepartmentId = lowConfidence ? "medical" : data.department;

  if (colour === "RED") {
    return {
      department: "emergency",
      confidence: 1,
      reasons: ["RED triage → Emergency first", ...data.reasons],
      alternatives: [],
      source: "rule",
      specialty,
    };
  }

  if (lowConfidence) {
    return {
      department: "medical",
      confidence: data.confidence,
      reasons: [`Routing uncertain (${Math.round(data.confidence * 100)}%) → Medical OPD, nurse to review`, ...data.reasons],
      alternatives: [data.department, ...data.alternatives].filter((d) => d !== "medical").slice(0, 2),
      source: "ai_low_confidence",
    };
  }

  return { ...data, source: "ai" };
}
