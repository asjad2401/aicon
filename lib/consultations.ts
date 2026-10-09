import "server-only";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { Prescription } from "@/lib/db/schema";

export type ConsultationInput = {
  notes?: string;
  examination?: string;
  diagnoses: string[];
  prescriptions: Prescription[];
  labOrders: string[];
  disposition: "discharged" | "admitted" | "referred" | "follow_up";
  referredTo?: string;
  followUpDate?: string;
  // Clinical validation feedback
  departmentCorrect?: boolean;
  correctDepartment?: string;
  briefRating?: "accurate" | "had_error" | "not_used";
  briefIssue?: string;
};

/** Saves the consultation and closes the visit (status → seen) in one step. */
export async function saveConsultation(visitId: number, doctor: { uid: number; actor: string }, input: ConsultationInput) {
  const db = getDb();
  const [visit] = await db.select().from(schema.visits).where(eq(schema.visits.id, visitId));
  if (!visit) return null;

  const values = {
    visitId,
    patientId: visit.patientId,
    doctorId: doctor.uid,
    notes: input.notes || null,
    examination: input.examination || null,
    diagnoses: input.diagnoses.filter(Boolean),
    prescriptions: input.prescriptions.filter((p) => p.drug.trim()),
    labOrders: input.labOrders.filter(Boolean),
    disposition: input.disposition,
    referredTo: input.referredTo || null,
    followUpDate: input.followUpDate || null,
    departmentCorrect: input.departmentCorrect ?? null,
    correctDepartment: input.departmentCorrect === false ? (input.correctDepartment ?? null) : null,
    briefRating: input.briefRating ?? null,
    briefIssue: input.briefRating === "had_error" ? (input.briefIssue ?? null) : null,
  };

  const [consultation] = await db
    .insert(schema.consultations)
    .values(values)
    .onConflictDoUpdate({ target: schema.consultations.visitId, set: values })
    .returning();
  await db.update(schema.visits).set({ status: "seen", seenAt: visit.seenAt ?? new Date() }).where(eq(schema.visits.id, visitId));
  await db.insert(schema.auditLog).values({
    visitId,
    actor: doctor.actor,
    action: "consultation_saved",
    payload: { disposition: input.disposition, diagnoses: values.diagnoses.length, prescriptions: values.prescriptions.length },
  });
  return consultation;
}

/** Every visit for a patient, newest first, with triage, vitals and consultation. */
export async function getPatientHistory(patientId: number) {
  const db = getDb();
  const [patient] = await db.select().from(schema.patients).where(eq(schema.patients.id, patientId));
  if (!patient) return null;
  const visits = await db
    .select({ visit: schema.visits, consultation: schema.consultations, doctor: schema.staff.name })
    .from(schema.visits)
    .leftJoin(schema.consultations, eq(schema.consultations.visitId, schema.visits.id))
    .leftJoin(schema.staff, eq(schema.staff.id, schema.consultations.doctorId))
    .where(eq(schema.visits.patientId, patientId))
    .orderBy(desc(schema.visits.arrivedAt));
  const documents = await db
    .select({ id: schema.documents.id, docType: schema.documents.docType, docDate: schema.documents.docDate, facility: schema.documents.facility })
    .from(schema.documents)
    .where(eq(schema.documents.patientId, patientId))
    .orderBy(desc(schema.documents.docDate));
  return { patient, visits, documents };
}

/** Prior Priora diagnoses, used as known history for routing. */
export async function priorDiagnoses(patientId: number) {
  const rows = await getDb()
    .select({ diagnoses: schema.consultations.diagnoses, at: schema.consultations.createdAt })
    .from(schema.consultations)
    .where(eq(schema.consultations.patientId, patientId));
  return rows.flatMap((r) => r.diagnoses.map((d) => `diagnosis (Priora visit ${r.at.getFullYear()}): ${d}`));
}
