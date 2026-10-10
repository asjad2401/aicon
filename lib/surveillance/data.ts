import "server-only";
import { and, eq, gte, isNotNull, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { AREA_IDS, HOSPITAL_BY_ID, HOSPITALS, SYNDROME_IDS, type HospitalId } from "./config";
import { detect, pkDate, type CaseRecord } from "./detect";
import { projectCases, resourceNeeds } from "./projection";

const DAYS = 30;

/** Anonymous case records (no names or passport codes) for the last 30 days. */
async function loadCases() {
  const since = new Date(Date.now() - (DAYS + 1) * 86_400_000);
  const rows = await getDb()
    .select({
      at: schema.visits.arrivedAt,
      area: schema.visits.area,
      hospital: schema.visits.hospital,
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

type Case = Awaited<ReturnType<typeof loadCases>>[number];

/** Which hospitals saw a signal's cases in the last 3 days: the reason a network is needed. */
function hospitalBreakdown(cases: Case[], area: string, syndrome: string, recentDays: Set<string>) {
  const counts = new Map<string, number>();
  for (const c of cases) {
    if (!c.syndromes.includes(syndrome) || (area !== "all" && c.area !== area) || !recentDays.has(pkDate(c.at))) continue;
    const h = c.hospital ?? "unknown";
    counts.set(h, (counts.get(h) ?? 0) + 1);
  }
  return [...counts].map(([hospital, count]) => ({ hospital, count })).sort((a, b) => b.count - a.count);
}

export async function getSurveillance() {
  const cases = await loadCases();
  const result = detect(cases as CaseRecord[], { days: DAYS, areas: [...AREA_IDS], syndromes: [...SYNDROME_IDS] });
  const recentDays = new Set(result.days.slice(-3));
  const signals = result.signals.map((s) =>
    s.level ? { ...s, hospitals: hospitalBreakdown(cases, s.area, s.syndrome, recentDays) } : s,
  );
  const since30 = new Set(result.days);
  const network = HOSPITALS.map((h) => ({
    hospital: h.id,
    intakes: cases.filter((c) => c.hospital === h.id && since30.has(pkDate(c.at))).length,
  }));
  return {
    ...result,
    signals,
    network,
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
  const byHospital = hospitalBreakdown(cases, area, syndrome, recentDays);
  if (byHospital.length) {
    const top = byHospital[0];
    stats.push({
      id: "s10",
      text: `Seen at ${byHospital.length} hospital(s) in the last 3 days: ${byHospital.map((h) => `${HOSPITAL_BY_ID[h.hospital as HospitalId]?.name ?? h.hospital} ${h.count}`).join(", ")}; the busiest single hospital saw ${top.count} of ${signal.last3}`,
    });
  }

  if (signal.level === "alert") {
    const p = projectCases(signal.series.map((x) => x.count));
    const needs = resourceNeeds(syndrome, p).map((r) => `${r.item} ${r.expected} (${r.low}–${r.high})`).join(", ");
    stats.push({
      id: "s11",
      text: `Projection next 3 days: ${p.daily.map((d) => d.expected).join(", ")} cases/day (total ${p.total.expected}, range ${p.total.low}–${p.total.high})${needs ? `; estimated needs: ${needs}` : ""}`,
    });
  }

  return { signal, stats, today };
}
