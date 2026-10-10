import "server-only";
import { randomBytes } from "node:crypto";
import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { Intake } from "@/lib/ai/intake";
import { PROMPT_VERSION_INTAKE } from "@/lib/ai/intake";
import type { Routing } from "@/lib/routing/route";
import { triage, type Vitals } from "@/lib/triage/sats";
import type { Colour } from "@/lib/triage/discriminators";
import { rankQueue } from "@/lib/queue";
import { generateBrief, PROMPT_VERSION_BRIEF } from "@/lib/ai/brief";

const DEPT_PREFIX: Record<string, string> = {
  emergency: "E",
  medical: "M",
  cardiology: "C",
  surgical: "S",
  orthopaedics: "O",
  gynae: "G",
  paediatrics: "P",
  ent: "N",
  eye: "Y",
  dermatology: "D",
  psychiatry: "Q",
  dental: "T",
};

function newPassportToken() {
  // 10 chars, URL-safe, unambiguous alphabet
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  return [...randomBytes(10)].map((b) => alphabet[b % alphabet.length]).join("");
}

/** Start of the current OPD day in Pakistan time (UTC+5, no DST), whatever the server's timezone. */
function startOfTodayPK() {
  const PK_OFFSET_MS = 5 * 3600_000;
  const pkNow = new Date(Date.now() + PK_OFFSET_MS);
  pkNow.setUTCHours(0, 0, 0, 0);
  return new Date(pkNow.getTime() - PK_OFFSET_MS);
}

export async function createVisit(input: {
  name?: string;
  age?: number;
  sex?: string;
  complaintText?: string;
  intake: Intake;
  routing: Routing;
  model?: string;
  passportToken?: string;
  area?: string;
}) {
  const db = getDb();

  // Re-derive triage on the server from the extracted findings (never trust a client colour).
  const result = triage({
    discriminatorIds: input.intake.discriminators.map((d) => d.id),
    painScore: input.intake.pain_score ?? undefined,
    age: input.age,
    uncertain: input.intake.confidence < 0.6,
    readingsDisagreed: input.intake.readings_disagreed,
    followUp: input.intake.follow_up,
  });

  // Returning patients keep their health passport (and its digitised history).
  const [existing] = input.passportToken
    ? await db.select().from(schema.patients).where(eq(schema.patients.passportToken, input.passportToken.toUpperCase()))
    : [];
  const [patient] = existing
    ? await db
        .update(schema.patients)
        .set({ age: input.age ?? existing.age, name: input.name || existing.name, sex: input.sex ?? existing.sex })
        .where(eq(schema.patients.id, existing.id))
        .returning()
    : await db
        .insert(schema.patients)
        .values({
          passportToken: newPassportToken(),
          name: input.name || null,
          age: input.age ?? null,
          sex: input.sex ?? null,
        })
        .returning();

  // Next token = highest number issued today in this department + 1 (never reuses a number).
  const [{ last }] = await db
    .select({ last: sql<number>`coalesce(max(substring(${schema.visits.tokenNo} from '[0-9]+$')::int), 0)` })
    .from(schema.visits)
    .where(
      and(
        eq(schema.visits.department, input.routing.department),
        gte(schema.visits.arrivedAt, startOfTodayPK()),
      ),
    );
  const tokenNo = `${DEPT_PREFIX[input.routing.department] ?? "X"}-${String(last + 1).padStart(3, "0")}`;

  const [visit] = await db
    .insert(schema.visits)
    .values({
      patientId: patient.id,
      tokenNo,
      complaintText: input.complaintText ?? input.intake.transcript,
      language: input.intake.language,
      intake: input.intake,
      provisionalTriage: result,
      colour: result.colour,
      department: input.routing.department,
      area: input.area ?? null,
      routing: input.routing,
      aiModel: input.model,
      promptVersion: PROMPT_VERSION_INTAKE,
    })
    .returning();

  await db.insert(schema.auditLog).values({
    visitId: visit.id,
    actor: "kiosk",
    action: "visit_created",
    payload: { colour: result.colour, department: input.routing.department, matched: result.matched },
  });

  return { visit, patient, triage: result };
}

// ── Queue & visit lifecycle ──────────────────────────────────────────────────

const ACTIVE_STATUSES = ["waiting", "triaged", "called"] as const;

const queueColumns = {
  id: schema.visits.id,
  tokenNo: schema.visits.tokenNo,
  colour: schema.visits.colour,
  department: schema.visits.department,
  status: schema.visits.status,
  arrivedAt: schema.visits.arrivedAt,
  calledAt: schema.visits.calledAt,
  chiefComplaint: sql<string>`${schema.visits.intake}->>'chief_complaint'`,
  provisional: sql<boolean>`${schema.visits.finalTriage} is null`,
  patientName: schema.patients.name,
  age: schema.patients.age,
  sex: schema.patients.sex,
};

/** Nurse view: everyone awaiting vitals. Doctor view: active patients in one department. */
export async function listQueue(opts: { view: "nurse" } | { view: "doctor"; department: string }) {
  const db = getDb();
  const where =
    opts.view === "nurse"
      ? eq(schema.visits.status, "waiting")
      : and(
          eq(schema.visits.department, opts.department),
          inArray(schema.visits.status, [...ACTIVE_STATUSES]),
        );
  const rows = await db
    .select(queueColumns)
    .from(schema.visits)
    .innerJoin(schema.patients, eq(schema.visits.patientId, schema.patients.id))
    .where(and(where, gte(schema.visits.arrivedAt, new Date(Date.now() - 24 * 3600_000))));
  return rankQueue(rows as (typeof rows[number] & { colour: Colour })[]);
}

export async function getVisitDetail(id: number) {
  const db = getDb();
  const [row] = await db
    .select({ visit: schema.visits, patient: schema.patients })
    .from(schema.visits)
    .innerJoin(schema.patients, eq(schema.visits.patientId, schema.patients.id))
    .where(eq(schema.visits.id, id));
  if (!row) return null;
  const documents = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.patientId, row.patient.id))
    .orderBy(desc(schema.documents.createdAt));
  const facts = await db.select().from(schema.facts).where(eq(schema.facts.patientId, row.patient.id));
  const [summary] = await db
    .select()
    .from(schema.summaries)
    .where(eq(schema.summaries.visitId, id))
    .orderBy(desc(schema.summaries.createdAt))
    .limit(1);
  const [consultation] = await db.select().from(schema.consultations).where(eq(schema.consultations.visitId, id));
  const previousVisits = await db
    .select({
      id: schema.visits.id,
      arrivedAt: schema.visits.arrivedAt,
      colour: schema.visits.colour,
      department: schema.visits.department,
      complaint: sql<string | null>`${schema.visits.intake}->>'chief_complaint'`,
      diagnoses: schema.consultations.diagnoses,
    })
    .from(schema.visits)
    .leftJoin(schema.consultations, eq(schema.consultations.visitId, schema.visits.id))
    .where(and(eq(schema.visits.patientId, row.patient.id), sql`${schema.visits.id} <> ${id}`))
    .orderBy(desc(schema.visits.arrivedAt))
    .limit(10);
  return { ...row, documents, facts, summary: summary ?? null, consultation: consultation ?? null, previousVisits };
}

/** Nurse confirms vitals → final SATS triage. Optional override is logged with a reason. */
export async function recordVitals(
  id: number,
  input: {
    vitals: Vitals;
    overrideColour?: Colour;
    overrideReason?: string;
    /** Nurse's own colour, chosen blinded before the system colour was shown. */
    nurseColour?: Colour;
    actor?: string;
    staffId?: number;
  },
) {
  const db = getDb();
  const [visit] = await db.select().from(schema.visits).where(eq(schema.visits.id, id));
  if (!visit?.intake) return null;
  const [patient] = await db.select().from(schema.patients).where(eq(schema.patients.id, visit.patientId));

  const result = triage({
    discriminatorIds: visit.intake.discriminators.map((d) => d.id),
    painScore: visit.intake.pain_score ?? undefined,
    age: patient?.age ?? undefined,
    vitals: input.vitals,
  });
  const colour = input.overrideColour ?? result.colour;

  // RED goes to Emergency first; remember the specialty for after stabilisation.
  let department = visit.department;
  let routing = visit.routing;
  if (colour === "RED" && department !== "emergency" && routing) {
    routing = {
      ...routing,
      specialty: routing.department,
      department: "emergency",
      reasons: ["RED after vitals → Emergency first", ...routing.reasons],
    };
    department = "emergency";
  }

  const [updated] = await db
    .update(schema.visits)
    .set({
      vitals: input.vitals,
      finalTriage: result,
      colour,
      overrideColour: input.overrideColour ?? null,
      nurseColour: input.nurseColour ?? null,
      triagedBy: input.staffId ?? null,
      overrideReason: input.overrideReason ?? null,
      department,
      routing,
      status: "triaged",
      triagedAt: new Date(),
    })
    .where(eq(schema.visits.id, id))
    .returning();

  await db.insert(schema.auditLog).values({
    visitId: id,
    actor: input.actor ?? "nurse",
    action: input.overrideColour ? "triage_override" : "triage_confirmed",
    payload: { computed: result.colour, nurse: input.nurseColour, final: colour, tews: result.tews, reason: input.overrideReason },
  });
  return { visit: updated, triage: result };
}

export async function visitDepartment(id: number) {
  const [v] = await getDb().select({ department: schema.visits.department }).from(schema.visits).where(eq(schema.visits.id, id));
  return v?.department ?? null;
}

export async function setVisitStatus(id: number, action: "call" | "seen" | "cancel", actor = "doctor") {
  const db = getDb();
  const now = new Date();
  const patch =
    action === "call"
      ? { status: "called", calledAt: now }
      : action === "seen"
        ? { status: "seen", seenAt: now }
        : { status: "cancelled" };
  const [updated] = await db.update(schema.visits).set(patch).where(eq(schema.visits.id, id)).returning();
  if (updated) await db.insert(schema.auditLog).values({ visitId: id, actor, action: `visit_${action}` });
  return updated ?? null;
}

// ── Pre-consultation brief ───────────────────────────────────────────────────

const DOC_NAMES: Record<string, string> = {
  lab_report: "Lab report",
  prescription: "Prescription",
  discharge_summary: "Discharge summary",
  ecg_report: "ECG report",
  imaging_report: "Imaging report",
  referral: "Referral",
};

/** Generate (or regenerate when new facts arrive) the cited brief for a visit. */
export async function ensureBrief(visitId: number, { force = false } = {}) {
  const detail = await getVisitDetail(visitId);
  if (!detail?.visit.intake) return null;
  if (detail.facts.length === 0) return { summary: null };

  const existing = detail.summary?.summary as { factCount?: number } | undefined;
  if (!force && existing?.factCount === detail.facts.length) return { summary: detail.summary };

  const docs = new Map(detail.documents.map((d) => [d.id, d]));
  const { brief, dropped, model } = await generateBrief({
    complaint: detail.visit.intake.chief_complaint,
    summary: detail.visit.intake.summary_en,
    age: detail.patient.age,
    sex: detail.patient.sex,
    facts: detail.facts.map((f) => {
      const doc = docs.get(f.documentId);
      return {
        id: f.id,
        kind: f.kind,
        label: f.label,
        value: f.value,
        unit: f.unit,
        date: f.date,
        flag: f.flag,
        source: [DOC_NAMES[doc?.docType ?? ""] ?? "Document", doc?.docDate, doc?.facility].filter(Boolean).join(", "),
      };
    }),
  });

  const [summary] = await getDb()
    .insert(schema.summaries)
    .values({
      visitId,
      summary: { ...brief, dropped, factCount: detail.facts.length, promptVersion: PROMPT_VERSION_BRIEF },
      model,
    })
    .returning();
  return { summary };
}
