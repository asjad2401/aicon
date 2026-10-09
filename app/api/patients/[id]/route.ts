import type { NextRequest } from "next/server";
import { requireStaff } from "@/lib/auth/server";
import { getPatientHistory } from "@/lib/consultations";

// GET: a patient's full visit history (triage, vitals, consultations, documents).
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/patients/[id]">) {
  const { error } = await requireStaff(["doctor", "nurse", "records", "admin"]);
  if (error) return error;
  const { id } = await ctx.params;
  const history = await getPatientHistory(Number(id));
  if (!history) return Response.json({ error: "Patient not found" }, { status: 404 });
  return Response.json(history);
}
