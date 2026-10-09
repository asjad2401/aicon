import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, gte, sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { Intake } from "@/lib/ai/intake";
import { PROMPT_VERSION_INTAKE } from "@/lib/ai/intake";
import type { Routing } from "@/lib/routing/route";
import { triage } from "@/lib/triage/sats";

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

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function createVisit(input: {
  name?: string;
  age?: number;
  sex?: string;
  complaintText?: string;
  intake: Intake;
  routing: Routing;
  model?: string;
}) {
  const db = getDb();

  // Re-derive triage on the server from the extracted findings (never trust a client colour).
  const result = triage({
    discriminatorIds: input.intake.discriminators.map((d) => d.id),
    painScore: input.intake.pain_score ?? undefined,
    age: input.age,
    uncertain: input.intake.confidence < 0.6,
  });

  const [patient] = await db
    .insert(schema.patients)
    .values({
      passportToken: newPassportToken(),
      name: input.name || null,
      age: input.age ?? null,
      sex: input.sex ?? null,
    })
    .returning();

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(schema.visits)
    .where(
      and(
        eq(schema.visits.department, input.routing.department),
        gte(schema.visits.arrivedAt, startOfToday()),
      ),
    );
  const tokenNo = `${DEPT_PREFIX[input.routing.department] ?? "X"}-${String(count + 1).padStart(3, "0")}`;

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
