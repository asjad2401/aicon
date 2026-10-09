import "server-only";
import { put } from "@vercel/blob";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { extractDocument, PROMPT_VERSION_DOCUMENTS } from "@/lib/ai/documents";

/** Find a patient by health-passport code (QR) or by a token number like "C-001" (most recent). */
export async function findPatient(code: string) {
  const db = getDb();
  const clean = code.trim().toUpperCase();
  const byPassport = await db.select().from(schema.patients).where(eq(schema.patients.passportToken, clean));
  if (byPassport[0]) return byPassport[0];

  const [visit] = await db
    .select({ patient: schema.patients })
    .from(schema.visits)
    .innerJoin(schema.patients, eq(schema.visits.patientId, schema.patients.id))
    .where(eq(schema.visits.tokenNo, clean))
    .orderBy(desc(schema.visits.arrivedAt))
    .limit(1);
  return visit?.patient ?? null;
}

export async function getPatientRecords(patientId: number) {
  const db = getDb();
  const documents = await db
    .select()
    .from(schema.documents)
    .where(eq(schema.documents.patientId, patientId))
    .orderBy(desc(schema.documents.createdAt));
  const facts = await db.select().from(schema.facts).where(eq(schema.facts.patientId, patientId));
  return { documents, facts };
}

/**
 * Store a document photo (private blob) and extract its facts with AI.
 * Facts carry bounding boxes so the doctor can verify each one against the image.
 */
export async function addDocument(patientId: number, file: { bytes: Buffer; mimeType: string; name: string }) {
  const db = getDb();
  const blob = await put(`patients/${patientId}/${Date.now()}-${file.name}`, file.bytes, {
    access: "private",
    contentType: file.mimeType,
    addRandomSuffix: true,
  });

  const [doc] = await db
    .insert(schema.documents)
    .values({ patientId, imageUrl: blob.url, status: "processing" })
    .returning();

  try {
    const { data, model } = await extractDocument({ base64: file.bytes.toString("base64"), mimeType: file.mimeType });
    const [updated] = await db
      .update(schema.documents)
      .set({
        docType: data.doc_type,
        docDate: data.date,
        facility: data.facility,
        quality: data.quality,
        extracted: { ...data, model, promptVersion: PROMPT_VERSION_DOCUMENTS },
        status: "done",
      })
      .where(eq(schema.documents.id, doc.id))
      .returning();

    if (data.facts.length) {
      await db.insert(schema.facts).values(
        data.facts.map((f) => ({
          documentId: doc.id,
          patientId,
          kind: f.kind,
          label: f.label,
          value: f.value,
          unit: f.unit,
          date: f.date ?? data.date,
          flag: f.flag,
          box: f.box_2d as [number, number, number, number],
          confidence: f.confidence,
          verified: f.confidence >= 0.7,
        })),
      );
    }
    await db.insert(schema.auditLog).values({
      actor: "records",
      action: "document_extracted",
      payload: { documentId: doc.id, patientId, facts: data.facts.length, model },
    });
    return updated;
  } catch (err) {
    console.error("[records] extraction failed", err);
    const [failed] = await db
      .update(schema.documents)
      .set({ status: "failed" })
      .where(eq(schema.documents.id, doc.id))
      .returning();
    return failed;
  }
}

export async function deleteFact(id: number) {
  await getDb().delete(schema.facts).where(eq(schema.facts.id, id));
}

/** Known history for routing: diagnoses, allergies and medications as short strings. */
export async function knownHistory(patientId: number) {
  const rows = await getDb()
    .select({ kind: schema.facts.kind, label: schema.facts.label, value: schema.facts.value, date: schema.facts.date })
    .from(schema.facts)
    .where(eq(schema.facts.patientId, patientId));
  return rows
    .filter((f) => ["diagnosis", "allergy", "medication", "procedure"].includes(f.kind))
    .map((f) => `${f.kind}: ${f.label}${f.value ? ` ${f.value}` : ""}${f.date ? ` (${f.date.slice(0, 4)})` : ""}`);
}
