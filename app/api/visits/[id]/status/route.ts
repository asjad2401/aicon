import type { NextRequest } from "next/server";
import { z } from "zod";
import { setVisitStatus } from "@/lib/visits";

const BodySchema = z.object({ action: z.enum(["call", "seen", "cancel"]) });

export async function POST(request: NextRequest, ctx: RouteContext<"/api/visits/[id]/status">) {
  const { id } = await ctx.params;
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid action" }, { status: 400 });
  const visit = await setVisitStatus(Number(id), parsed.data.action);
  if (!visit) return Response.json({ error: "Visit not found" }, { status: 404 });
  return Response.json({ visit });
}
