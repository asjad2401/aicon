import type { NextRequest } from "next/server";
import { DEPARTMENT_IDS } from "@/lib/routing/departments";
import { listQueue } from "@/lib/visits";
import { requireStaff } from "@/lib/auth/server";

// GET /api/queue?view=nurse  |  /api/queue?dept=cardiology
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const dept = params.get("dept");
  if (params.get("view") === "nurse") {
    const { error } = await requireStaff(["nurse", "admin"]);
    if (error) return error;
    return Response.json({ items: await listQueue({ view: "nurse" }) });
  }
  if (!dept || !(DEPARTMENT_IDS as readonly string[]).includes(dept)) {
    return Response.json({ error: "Unknown department" }, { status: 400 });
  }
  const { error } = await requireStaff(["doctor", "admin"], { department: dept });
  if (error) return error;
  return Response.json({ items: await listQueue({ view: "doctor", department: dept }) });
}
