import type { NextRequest } from "next/server";
import { z } from "zod";
import { recordVitals } from "@/lib/visits";

const COLOURS = ["RED", "ORANGE", "YELLOW", "GREEN"] as const;

const BodySchema = z
  .object({
    vitals: z.object({
      rr: z.number().min(0).max(80),
      hr: z.number().min(0).max(300),
      sbp: z.number().min(0).max(300),
      temp: z.number().min(25).max(45),
      avpu: z.enum(["alert", "confused", "voice", "pain", "unresponsive"]),
      mobility: z.enum(["walking", "with_help", "immobile"]),
      trauma: z.boolean(),
    }),
    overrideColour: z.enum(COLOURS).optional(),
    overrideReason: z.string().max(300).optional(),
  })
  .refine((b) => !b.overrideColour || (b.overrideReason?.trim().length ?? 0) >= 3, {
    message: "An override needs a reason",
    path: ["overrideReason"],
  });

// POST: nurse records vitals → final SATS triage (with optional, logged override).
export async function POST(request: NextRequest, ctx: RouteContext<"/api/visits/[id]/vitals">) {
  const { id } = await ctx.params;
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const result = await recordVitals(Number(id), parsed.data);
  if (!result) return Response.json({ error: "Visit not found" }, { status: 404 });
  return Response.json(result);
}
