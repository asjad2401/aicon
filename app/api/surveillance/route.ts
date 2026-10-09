import { getSurveillance } from "@/lib/surveillance/data";
import { requireStaff } from "@/lib/auth/server";

// GET: anonymous syndromic surveillance (counts per area × syndrome × day, with EARS scores).
export async function GET() {
  const { error } = await requireStaff(["officer", "admin"]);
  if (error) return error;
  const data = await getSurveillance();
  // Only ship series that have any cases, to keep the payload small.
  const signals = data.signals.filter((s) => s.area === "all" || s.series.some((p) => p.count > 0));
  return Response.json({ ...data, signals });
}
