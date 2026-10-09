import type { NextRequest } from "next/server";
import { z } from "zod";
import { generateOutbreakBrief } from "@/lib/ai/outbreak";
import { AREA_BY_ID, AREA_IDS, SYNDROME_BY_ID, SYNDROME_IDS, type AreaId } from "@/lib/surveillance/config";
import { signalContext } from "@/lib/surveillance/data";

export const maxDuration = 60;

const BodySchema = z.object({ area: z.enum([...AREA_IDS, "all"]), syndrome: z.enum(SYNDROME_IDS) });
const cache = new Map<string, unknown>();

// POST: AI early-warning brief for one flagged signal (cached per day and count).
export async function POST(request: NextRequest) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { area, syndrome } = parsed.data;

  const ctx = await signalContext(area, syndrome);
  if (!ctx) return Response.json({ error: "No such signal" }, { status: 404 });

  const key = `${area}|${syndrome}|${ctx.today}|${ctx.signal.today}|${ctx.signal.last3}`;
  if (cache.has(key)) return Response.json(cache.get(key));

  try {
    const { brief, model } = await generateOutbreakBrief({
      areaName: area === "all" ? "Islamabad & Rawalpindi (all areas)" : AREA_BY_ID[area as AreaId].name,
      syndrome: SYNDROME_BY_ID[syndrome],
      level: ctx.signal.level ?? "none",
      stats: ctx.stats,
    });
    const body = { brief, stats: ctx.stats, model };
    cache.set(key, body);
    return Response.json(body);
  } catch (err) {
    console.error("[surveillance] brief failed", err);
    return Response.json({ error: "Could not generate the brief" }, { status: 502 });
  }
}
