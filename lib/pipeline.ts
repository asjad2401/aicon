import "server-only";
import { extractIntake, type IntakeInput } from "@/lib/ai/intake";
import { routePatient } from "@/lib/routing/route";
import { triage } from "@/lib/triage/sats";
import { COLOUR_RANK } from "@/lib/triage/discriminators";
import type { Intake } from "@/lib/ai/intake";
import { planFollowUp, type FollowUp } from "@/lib/ai/followup";
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
  // Self-consistency: two independent readings in parallel (no added latency). If they disagree,
  // the more urgent one is kept and flagged for nurse review. Eval: removed the remaining under-triage.
  const [first, second] = await Promise.allSettled([
    extractIntake(input, ctx),
    extractIntake(input, ctx, { temperature: 0.8 }),
  ]);
  if (first.status === "rejected" && second.status === "rejected") {
    if (input.kind === "text") {
      console.warn("[pipeline] Gemini unavailable, falling back to Priora Lite:", String(first.reason).slice(0, 200));
      return runOfflineIntake(input.text, ctx);
    }
    throw first.reason;
  }
  const readings = [first, second].filter((r) => r.status === "fulfilled").map((r) => r.value);
  const colourOf = (i: Intake) =>
    triage({ discriminatorIds: i.discriminators.map((d) => d.id), painScore: ctx.painScore ?? i.pain_score ?? undefined, age: ctx.age, uncertain: i.confidence < 0.6 }).colour;
  const scored = readings.map((r) => ({ ...r, colour: colourOf(r.data) }));
  const chosen = scored.reduce((a, b) => (COLOUR_RANK[b.colour] > COLOUR_RANK[a.colour] ? b : a));
  const disagreed = new Set(scored.map((s) => s.colour)).size > 1;
  const { model } = chosen;
  const intake: Intake = {
    ...chosen.data,
    // Persist the patient's own pain rating so the server-side re-triage at save time matches.
    ...(ctx.painScore != null && { pain_score: ctx.painScore }),
    ...(disagreed && { readings_disagreed: scored.map((s) => s.colour) }),
  };

  const result = triage({
    discriminatorIds: intake.discriminators.map((d) => d.id),
    // Patient's own 0–10 rating (kiosk pain scale) takes precedence over words.
    painScore: intake.pain_score ?? undefined,
    age: ctx.age,
    uncertain: intake.confidence < 0.6,
    readingsDisagreed: intake.readings_disagreed,
  });

  // Routing and the talking kiosk's follow-up decision run in parallel.
  const [routing, followUp] = await Promise.all([
    routePatient({ intake, colour: result.colour, age: ctx.age, sex: ctx.sex, knownHistory: ctx.knownHistory }),
    planFollowUp(intake, result.colour, ctx).catch((err): FollowUp | null => {
      console.warn("[pipeline] follow-up planner failed:", String(err).slice(0, 160));
      return null;
    }),
  ]);

  return { intake, triage: result, routing, followUp, model, ms: Date.now() - started, offline: false as const };
}
