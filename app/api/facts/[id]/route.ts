import type { NextRequest } from "next/server";
import { deleteFact } from "@/lib/records";
import { requireStaff } from "@/lib/auth/server";

// Records clerk removes a wrongly extracted fact.
export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/facts/[id]">) {
  const { error } = await requireStaff(["records", "nurse", "doctor", "admin"]);
  if (error) return error;
  const { id } = await ctx.params;
  await deleteFact(Number(id));
  return new Response(null, { status: 204 });
}
