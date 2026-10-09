import "server-only";
import { and, eq, isNotNull } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { TARGET_MINUTES, type Colour } from "@/lib/triage/discriminators";
import { triageAgreement, type Pair } from "./stats";

/** Everything the clinical validation dashboard shows, from real workflow records. */
export async function getValidation() {
  const db = getDb();

  const triaged = await db
    .select({
      nurse: schema.visits.nurseColour,
      final: schema.visits.finalTriage,
      override: schema.visits.overrideColour,
      model: schema.visits.aiModel,
    })
    .from(schema.visits)
    .where(isNotNull(schema.visits.nurseColour));
  const pairs: Pair[] = triaged
    .filter((t) => t.final)
    .map((t) => ({ nurse: t.nurse as Colour, system: t.final!.colour }));
  const synthetic = triaged.filter((t) => t.model?.startsWith("seed")).length;

  const consults = await db
    .select({
      deptCorrect: schema.consultations.departmentCorrect,
      correctDept: schema.consultations.correctDepartment,
      routedTo: schema.visits.department,
      specialty: schema.visits.routing,
      briefRating: schema.consultations.briefRating,
      briefIssue: schema.consultations.briefIssue,
      complaint: schema.visits.complaintText,
      model: schema.visits.aiModel,
    })
    .from(schema.consultations)
    .innerJoin(schema.visits, eq(schema.visits.id, schema.consultations.visitId));

  const routed = consults.filter((c) => c.deptCorrect != null);
  const briefRated = consults.filter((c) => c.briefRating === "accurate" || c.briefRating === "had_error");

  const seen = await db
    .select({ colour: schema.visits.colour, arrivedAt: schema.visits.arrivedAt, calledAt: schema.visits.calledAt, seenAt: schema.visits.seenAt })
    .from(schema.visits)
    .where(and(eq(schema.visits.status, "seen"), isNotNull(schema.visits.finalTriage)));
  const timing = (["RED", "ORANGE", "YELLOW", "GREEN"] as Colour[]).map((colour) => {
    const waits = seen
      .filter((v) => v.colour === colour && (v.calledAt ?? v.seenAt))
      .map((v) => ((v.calledAt ?? v.seenAt)!.getTime() - v.arrivedAt.getTime()) / 60_000)
      .sort((a, b) => a - b);
    return {
      colour,
      n: waits.length,
      median: waits.length ? waits[Math.floor(waits.length / 2)] : null,
      withinTarget: waits.length ? waits.filter((w) => w <= Math.max(TARGET_MINUTES[colour], 1)).length / waits.length : null,
    };
  });

  return {
    triage: { ...triageAgreement(pairs), overrides: triaged.filter((t) => t.override).length, synthetic },
    routing: {
      n: routed.length,
      correct: routed.length ? routed.filter((c) => c.deptCorrect).length / routed.length : null,
      misroutes: routed
        .filter((c) => c.deptCorrect === false)
        .map((c) => ({ complaint: c.complaint, routedTo: c.specialty?.specialty ?? c.routedTo, shouldBe: c.correctDept })),
    },
    brief: {
      n: briefRated.length,
      accurate: briefRated.length ? briefRated.filter((c) => c.briefRating === "accurate").length / briefRated.length : null,
      issues: briefRated.filter((c) => c.briefRating === "had_error" && c.briefIssue).map((c) => c.briefIssue!),
    },
    consultations: consults.length,
    syntheticConsultations: consults.filter((c) => c.model?.startsWith("seed")).length,
    timing,
  };
}
