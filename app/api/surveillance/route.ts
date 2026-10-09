import { getSurveillance } from "@/lib/surveillance/data";

// GET: anonymous syndromic surveillance (counts per area × syndrome × day, with EARS scores).
export async function GET() {
  const data = await getSurveillance();
  // Only ship series that have any cases, to keep the payload small.
  const signals = data.signals.filter((s) => s.area === "all" || s.series.some((p) => p.count > 0));
  return Response.json({ ...data, signals });
}
