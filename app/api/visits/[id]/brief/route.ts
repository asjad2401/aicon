import type { NextRequest } from "next/server";
import { ensureBrief, visitDepartment } from "@/lib/visits";
import { requireStaff } from "@/lib/auth/server";

export const maxDuration = 60;

// POST: generate the cited pre-consultation brief (cached until new facts arrive). ?force=1 regenerates.
export async function POST(request: NextRequest, ctx: RouteContext<"/api/visits/[id]/brief">) {
  const { id } = await ctx.params;
  const { error } = await requireStaff(["doctor", "admin"], { department: await visitDepartment(Number(id)) });
  if (error) return error;
  try {
    const result = await ensureBrief(Number(id), { force: request.nextUrl.searchParams.get("force") === "1" });
    if (!result) return Response.json({ error: "Visit not found" }, { status: 404 });
    return Response.json(result);
  } catch (err) {
    console.error("[brief] failed", err);
    return Response.json({ error: "Could not generate the brief" }, { status: 502 });
  }
}
