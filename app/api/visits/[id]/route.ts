import type { NextRequest } from "next/server";
import { getVisitDetail } from "@/lib/visits";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/visits/[id]">) {
  const { id } = await ctx.params;
  const detail = await getVisitDetail(Number(id));
  if (!detail) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(detail);
}
