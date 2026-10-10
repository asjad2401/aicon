import { z } from "zod";
import { IntakeSchema } from "@/lib/ai/intake";
import { DEPARTMENT_IDS } from "@/lib/routing/departments";
import { createVisit } from "@/lib/visits";
import { AREA_IDS } from "@/lib/surveillance/config";

const RoutingSchema = z.object({
  department: z.enum(DEPARTMENT_IDS),
  confidence: z.number(),
  reasons: z.array(z.string()),
  alternatives: z.array(z.enum(DEPARTMENT_IDS)),
  source: z.enum(["rule", "ai", "ai_low_confidence", "offline_model"]),
  specialty: z.enum(DEPARTMENT_IDS).optional(),
});

const BodySchema = z.object({
  name: z.string().max(80).optional(),
  age: z.number().int().min(0).max(120).optional(),
  sex: z.enum(["male", "female", "other"]).optional(),
  intake: IntakeSchema,
  routing: RoutingSchema,
  model: z.string().optional(),
  passportToken: z.string().max(20).optional(),
  area: z.enum(AREA_IDS).optional(),
});

// POST: patient confirmed the analysis → create patient + visit + token.
export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const { visit, patient, triage } = await createVisit(parsed.data);
    return Response.json({
      visitId: visit.id,
      tokenNo: visit.tokenNo,
      passportToken: patient.passportToken,
      colour: triage.colour,
      department: visit.department,
    });
  } catch (err) {
    console.error("[visits] create failed", err);
    return Response.json({ error: "Could not create visit" }, { status: 500 });
  }
}
