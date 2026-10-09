import type { NextRequest } from "next/server";
import { DEPARTMENT_IDS } from "@/lib/routing/departments";
import { listQueue } from "@/lib/visits";

// GET /api/queue?view=nurse  |  /api/queue?dept=cardiology
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const dept = params.get("dept");
  if (params.get("view") === "nurse") {
    return Response.json({ items: await listQueue({ view: "nurse" }) });
  }
  if (!dept || !(DEPARTMENT_IDS as readonly string[]).includes(dept)) {
    return Response.json({ error: "Unknown department" }, { status: 400 });
  }
  return Response.json({ items: await listQueue({ view: "doctor", department: dept }) });
}
