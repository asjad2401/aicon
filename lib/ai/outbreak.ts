import "server-only";
import { z } from "zod";
import { generateJSON, MODELS, ThinkingLevel } from "./client";
import type { Syndrome } from "@/lib/surveillance/config";

/**
 * AI #6: Outbreak alert brief for the District Health Officer.
 * Input: a flagged signal's numbered statistics (computed deterministically) and the
 * syndrome's standard response checklist. Output: a short brief where every evidence
 * line cites stat ids and every action comes from the checklist. Uncited lines are dropped.
 * Signals are for investigation, not confirmation.
 */

export const PROMPT_VERSION_OUTBREAK = "outbreak-v1";

export async function generateOutbreakBrief(input: {
  areaName: string;
  syndrome: Syndrome;
  level: string;
  stats: { id: string; text: string }[];
}) {
  const statIds = input.stats.map((s) => s.id) as [string, ...string[]];
  const actionIds = input.syndrome.actions.map((a) => a.id) as [string, ...string[]];

  const Schema = z.object({
    headline: z.string().describe("One sentence for a district health officer"),
    evidence: z
      .array(z.object({ text: z.string(), stat_ids: z.array(z.enum(statIds)).min(1) }))
      .describe("3–5 short lines describing the signal, each citing the stats it uses"),
    who_is_affected: z.string().describe("One sentence on age/sex pattern, citing nothing beyond the stats"),
    actions: z
      .array(z.object({ id: z.enum(actionIds), why: z.string().describe("Half a sentence: why this action now") }))
      .describe("Prioritised actions, chosen ONLY from the checklist"),
    caveats: z.array(z.string()).describe("1–2 reasons this may not be a true outbreak (e.g. small numbers, reporting change)"),
  });

  const { data, model } = await generateJSON({
    schema: Schema,
    model: MODELS.fast,
    thinking: ThinkingLevel.LOW,
    timeoutMs: 30_000,
    system: `You write early-warning briefs for a District Health Officer in Islamabad/Rawalpindi from syndromic
surveillance of hospital OPD intake. This is a SIGNAL for investigation, not a confirmed outbreak:
never claim a diagnosis or confirmed disease. Use only the numbered statistics provided and cite them.
Choose response actions only from the checklist. Be concise and concrete.`,
    contents: JSON.stringify({
      area: input.areaName,
      syndrome: { name: input.syndrome.label, case_definition: input.syndrome.definition, possible_cause: input.syndrome.concern },
      signal_level: input.level,
      stats: input.stats,
      checklist: input.syndrome.actions,
    }),
  });

  const evidence = data.evidence.filter((e) => e.stat_ids.length > 0);
  const actions = data.actions
    .map((a) => ({ ...a, text: input.syndrome.actions.find((x) => x.id === a.id)?.text ?? "" }))
    .filter((a) => a.text);
  return { brief: { ...data, evidence, actions }, model };
}
