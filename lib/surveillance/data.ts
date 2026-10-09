import "server-only";
import { and, eq, gte, isNotNull, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { AREA_IDS, SYNDROME_IDS } from "./config";
import { detect, pkDate, type CaseRecord } from "./detect";

const DAYS = 30;

/** Anonymous case records (no names or passport codes) for the last 30 days. */
async function loadCases() {
  const since = new Date(Date.now() - (DAYS + 1) * 86_400_000);
  const rows = await getDb()
    .select({
      at: schema.visits.arrivedAt,
      area: schema.visits.area,
      syndromes: sql<string[] | null>`${schema.visits.intake}->'syndromes'`,
      complaint: sql<string | null>`${schema.visits.intake}->>'chief_complaint'`,
      age: schema.patients.age,
      sex: schema.patients.sex,
    })
    .from(schema.visits)
    .innerJoin(schema.patients, eq(schema.visits.patientId, schema.patients.id))
    .where(and(gte(schema.visits.arrivedAt, since), isNotNull(schema.visits.intake)));
  return rows.map((r) => ({ ...r, syndromes: Array.isArray(r.syndromes) ? r.syndromes : [] }));
}

export async function getSurveillance() {
  const cases = await loadCases();
  const result = detect(cases as CaseRecord[], { days: DAYS, areas: [...AREA_IDS], syndromes: [...SYNDROME_IDS] });
  return {
    ...result,
    patientsAnalysed: cases.length,
    syndromeCases: cases.filter((c) => c.syndromes.length > 0).length,
  };
}

/** Stats for one signal, numbered so the AI brief can cite them. */
export async function signalContext(area: string, syndrome: string) {
  const cases = await loadCases();
  const { signals, today } = detect(cases as CaseRecord[], { days: DAYS, areas: [...AREA_IDS], syndromes: [...SYNDROME_IDS] });
  const signal = signals.find((s) => s.area === area && s.syndrome === syndrome);
  if (!signal) return null;

  const recentDays = new Set(signal.series.slice(-3).map((p) => p.date));
  const recent = cases.filter(
    (c) => c.syndromes.includes(syndrome) && (area === "all" || c.area === area) && recentDays.has(pkDate(c.at)),
  );
  const band = (age: number | null) => (age == null ? "unknown" : age < 5 ? "under 5" : age < 15 ? "5–14" : age < 45 ? "15–44" : age < 65 ? "45–64" : "65+");
  const tally = <T extends string>(xs: T[]) => Object.entries(xs.reduce<Record<string, number>>((m, x) => ((m[x] = (m[x] ?? 0) + 1), m), {}));

  const last14 = signal.series.slice(-14);
  const stats: { id: string; text: string }[] = [
    { id: "s1", text: `${signal.today} cases today (${today})` },
    { id: "s2", text: `Expected about ${signal.baselineMean} per day (7-day baseline, SD ${signal.baselineSd})` },
    { id: "s3", text: `Aberration score ${signal.score} (alert threshold 3)` },
    { id: "s4", text: `${signal.last3} cases in the last 3 days` },
    { id: "s5", text: `Daily counts, last 14 days: ${last14.map((p) => p.count).join(", ")}` },
    { id: "s6", text: `Ages (last 3 days): ${tally(recent.map((c) => band(c.age))).map(([k, v]) => `${k}: ${v}`).join(", ") || "n/a"}` },
    { id: "s7", text: `Sex (last 3 days): ${tally(recent.map((c) => c.sex ?? "unknown")).map(([k, v]) => `${k}: ${v}`).join(", ") || "n/a"}` },
    { id: "s8", text: `Presenting complaints (last 3 days): ${tally(recent.map((c) => (c.complaint ?? "").toLowerCase()).filter(([k]) => k)).slice(0, 6).map(([k, v]) => `${k} ×${v}`).join("; ") || "n/a"}` },
  ];

  // Spread to neighbouring areas: other areas with the same syndrome rising.
  const others = signals
    .filter((s) => s.syndrome === syndrome && s.area !== area && s.area !== "all" && s.level)
    .map((s) => `${s.area} (${s.level}, ${s.today} today)`);
  if (others.length) stats.push({ id: "s9", text: `Same syndrome also flagged in: ${others.join(", ")}` });

  return { signal, stats, today };
}
