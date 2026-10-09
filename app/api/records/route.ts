import type { NextRequest } from "next/server";
import { addDocument, findPatient, getPatientRecords } from "@/lib/records";

export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

// GET /api/records?code=C-001 | PASSPORT  → patient + documents + facts
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code") ?? "";
  const patient = await findPatient(code);
  if (!patient) return Response.json({ error: "No patient found for this code" }, { status: 404 });
  return Response.json({ patient, ...(await getPatientRecords(patient.id)) });
}

// POST multipart: code, file → stores the photo privately and extracts facts with AI.
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const patient = await findPatient(String(form.get("code") ?? ""));
  if (!patient) return Response.json({ error: "No patient found for this code" }, { status: 404 });

  const file = form.get("file") as File | null;
  if (!file) return Response.json({ error: "No file" }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "Image too large (max 4 MB)" }, { status: 413 });
  if (!IMAGE_TYPES.includes(file.type)) return Response.json({ error: "Please upload a photo (JPEG/PNG)" }, { status: 415 });

  const doc = await addDocument(patient.id, {
    bytes: Buffer.from(await file.arrayBuffer()),
    mimeType: file.type,
    name: file.name.replace(/[^\w.-]/g, "_").slice(-60) || "document.jpg",
  });
  return Response.json({ document: doc });
}
