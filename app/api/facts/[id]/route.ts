import type { NextRequest } from "next/server";
import { deleteFact } from "@/lib/records";

// Records clerk removes a wrongly extracted fact.
export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/facts/[id]">) {
  const { id } = await ctx.params;
  await deleteFact(Number(id));
  return new Response(null, { status: 204 });
}
