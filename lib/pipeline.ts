import "server-only";
import { extractIntake, type IntakeInput } from "@/lib/ai/intake";
import { routePatient } from "@/lib/routing/route";
import { triage } from "@/lib/triage/sats";

/** Intake → SATS triage → routing. Shared by the API and the eval script. */
export async function runIntakePipeline(
  input: IntakeInput,
  ctx: { age?: number; sex?: string; knownHistory?: string[] } = {},
) {
  const started = Date.now();
  const { data: intake, model } = await extractIntake(input, ctx);

  const result = triage({
    discriminatorIds: intake.discriminators.map((d) => d.id),
    painScore: intake.pain_score ?? undefined,
    age: ctx.age,
    uncertain: intake.confidence < 0.6,
  });

  const routing = await routePatient({
    intake,
    colour: result.colour,
    age: ctx.age,
    sex: ctx.sex,
    knownHistory: ctx.knownHistory,
  });

  return { intake, triage: result, routing, model, ms: Date.now() - started };
}
