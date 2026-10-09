import type { NextRequest } from "next/server";
import { findPatient, getPatientRecords } from "@/lib/records";

// Kiosk: returning patient enters their passport code. Returns identity only, no medical facts.
export async function GET(request: NextRequest) {
  const patient = await findPatient(request.nextUrl.searchParams.get("code") ?? "");
  if (!patient) return Response.json({ error: "Code not recognised" }, { status: 404 });
  const { documents } = await getPatientRecords(patient.id);
  return Response.json({
    passportToken: patient.passportToken,
    name: patient.name,
    age: patient.age,
    sex: patient.sex,
    reports: documents.length,
  });
}
