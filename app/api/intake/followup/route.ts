import { z } from "zod";
import { StoredIntakeSchema, type Intake } from "@/lib/ai/intake";
import { DEPARTMENT_IDS } from "@/lib/routing/departments";
import { routePatient } from "@/lib/routing/route";
import { DISCRIMINATOR_IDS } from "@/lib/triage/discriminators";
import { triage } from "@/lib/triage/sats";
import { FOLLOW_UP_QUESTIONS } from "@/lib/voice/phrases";

export const maxDuration = 30;

const BodySchema = z.object({
  intake: StoredIntakeSchema,
  routing: z.object({
    department: z.enum(DEPARTMENT_IDS),
    confidence: z.number(),
    reasons: z.array(z.string()),
    alternatives: z.array(z.enum(DEPARTMENT_IDS)),
    source: z.enum(["rule", "ai", "ai_low_confidence", "offline_model"]),
    specialty: z.enum(DEPARTMENT_IDS).optional(),
  }),
  age: z.number().int().min(0).max(120).optional(),
  sex: z.string().max(10).optional(),
  target: z.enum(DISCRIMINATOR_IDS),
  answer: z.enum(["yes", "no", "unsure"]),
});

// POST: the patient answered the kiosk's spoken follow-up question → deterministic re-triage.
export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { routing: previousRouting, age, sex, target, answer } = parsed.data;

  const question = FOLLOW_UP_QUESTIONS[target]?.en ?? target;
  const intake: Intake = {
    ...parsed.data.intake,
    discriminators:
      answer === "yes" && !parsed.data.intake.discriminators.some((d) => d.id === target)
        ? [...parsed.data.intake.discriminators, { id: target as Intake["discriminators"][number]["id"], evidence: `Confirmed on follow-up: “${question}”` }]
        : parsed.data.intake.discriminators,
    follow_up: { target, question, answer },
  };

  const result = triage({
    discriminatorIds: intake.discriminators.map((d) => d.id),
    painScore: intake.pain_score ?? undefined,
    age,
    uncertain: intake.confidence < 0.6,
    readingsDisagreed: intake.readings_disagreed,
    followUp: intake.follow_up,
  });

  // A confirmed sign can change the right department (e.g. chest pain → Cardiology); re-route only then.
  let routing = previousRouting;
  if (answer === "yes") {
    try {
      routing = await routePatient({ intake, colour: result.colour, age, sex });
    } catch {
      if (result.colour === "RED") routing = { ...previousRouting, department: "emergency", specialty: previousRouting.department, source: "rule" };
    }
  }
  return Response.json({ intake, triage: result, routing, changed: answer === "yes" });
}
