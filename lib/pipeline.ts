import "server-only";
import { extractIntake, type IntakeInput } from "@/lib/ai/intake";
import { routePatient } from "@/lib/routing/route";
import { triage } from "@/lib/triage/sats";
import { runOfflineIntake } from "@/lib/lite/offline";

/** Intake → SATS triage → routing. Shared by the API and the eval script. */
export async function runIntakePipeline(
  input: IntakeInput,
  ctx: { age?: number; sex?: string; knownHistory?: string[]; painScore?: number; forceOffline?: boolean } = {},
) {
  const started = Date.now();
  // Offline path: our own model (Priora Lite). Text only; voice needs the online model.
  if (ctx.forceOffline) {
    if (input.kind !== "text") throw new Error("Voice is unavailable offline. Please type.");
    return runOfflineIntake(input.text, ctx);
  }
  let extracted;
  try {
    extracted = await extractIntake(input, ctx);
  } catch (err) {
    if (input.kind === "text") {
      console.warn("[pipeline] Gemini unavailable, falling back to Priora Lite:", String(err).slice(0, 200));
      return runOfflineIntake(input.text, ctx);
    }
    throw err;
  }
  const { model } = extracted;
  // Persist the patient's own pain rating so the server-side re-triage at save time matches.
  const intake = ctx.painScore != null ? { ...extracted.data, pain_score: ctx.painScore } : extracted.data;

  const result = triage({
    discriminatorIds: intake.discriminators.map((d) => d.id),
    // Patient's own 0–10 rating (kiosk pain scale) takes precedence over words.
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

  return { intake, triage: result, routing, model, ms: Date.now() - started, offline: false as const };
}
