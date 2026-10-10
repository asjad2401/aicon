import { getSurveillance } from "@/lib/surveillance/data";

// Public, read-only district snapshot for the landing page.
// Anonymous aggregates only: counts per area × syndrome, alert levels, hospital intake totals.
// No complaints, ages, names or individual records.
export async function GET() {
  const d = await getSurveillance();
  return Response.json({
    today: d.today,
    network: d.network,
    signals: d.signals
      .filter((s) => s.area !== "all" && s.last3 > 0)
      .map((s) => ({
        area: s.area,
        syndrome: s.syndrome,
        today: s.today,
        last3: s.last3,
        baselineMean: s.baselineMean,
        baselineSd: s.baselineSd,
        score: s.score,
        level: s.level,
        series: [],
      })),
  });
}
