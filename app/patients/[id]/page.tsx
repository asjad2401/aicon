import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Loader2 } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { TriageBadge } from "@/components/triage-badge";
import { getSession } from "@/lib/auth/server";
import { getPatientHistory } from "@/lib/consultations";
import { DEPARTMENT_BY_ID, type DepartmentId } from "@/lib/routing/departments";
import type { Colour } from "@/lib/triage/discriminators";

const when = (d: Date) => d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Karachi" });
const dept = (id: string | null) => (id ? (DEPARTMENT_BY_ID[id as DepartmentId]?.name ?? id) : "");
const DOC: Record<string, string> = { lab_report: "Lab report", prescription: "Prescription", discharge_summary: "Discharge summary", ecg_report: "ECG report", imaging_report: "Imaging", referral: "Referral" };

async function History({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSession();
  if (!user || !["doctor", "nurse", "records", "admin"].includes(user.role)) redirect("/login");
  const { id } = await params;
  const h = await getPatientHistory(Number(id));
  if (!h) notFound();
  const { patient, visits, documents } = h;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{patient.name ?? "Unnamed patient"}</h1>
          <p className="text-muted-foreground">
            {patient.age ?? "?"} {patient.sex ?? ""} · Health passport <code className="rounded bg-muted px-1">{patient.passportToken}</code> · {visits.length} visit(s)
          </p>
        </div>
        <Link href={`/records?code=${patient.passportToken}`} className="rounded-lg border px-3 py-2 text-sm hover:bg-muted">
          {documents.length} old report(s) on file →
        </Link>
      </div>

      <ol className="flex flex-col gap-4 border-l-2 border-primary/20 pl-6">
        {visits.map(({ visit, consultation, doctor }) => (
          <li key={visit.id} className="relative rounded-xl border bg-card p-4">
            <span className="absolute -left-[33px] top-5 size-3 rounded-full bg-primary" />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">
                {when(visit.arrivedAt)} · <span className="tabular-nums">{visit.tokenNo}</span> · {dept(visit.department)}
              </p>
              <TriageBadge colour={visit.colour as Colour} size="sm" />
            </div>
            <p className="mt-1 text-sm">{visit.intake?.chief_complaint}</p>
            {visit.vitals && (
              <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                HR {visit.vitals.hr} · RR {visit.vitals.rr} · BP {visit.vitals.sbp} · T {visit.vitals.temp}°C
                {visit.finalTriage?.tews != null && ` · TEWS ${visit.finalTriage.tews}`}
                {visit.nurseColour && ` · nurse assessed ${visit.nurseColour}`}
              </p>
            )}
            {consultation ? (
              <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm">
                <p>
                  <span className="text-muted-foreground">Diagnosis:</span> <strong>{consultation.diagnoses.join("; ")}</strong>
                </p>
                {consultation.prescriptions.length > 0 && (
                  <p>
                    <span className="text-muted-foreground">Rx:</span>{" "}
                    {consultation.prescriptions.map((p) => [p.drug, p.dose, p.frequency, p.duration].filter(Boolean).join(" ")).join(" · ")}
                  </p>
                )}
                {consultation.labOrders.length > 0 && (
                  <p><span className="text-muted-foreground">Labs:</span> {consultation.labOrders.join(", ")}</p>
                )}
                <p>
                  <span className="text-muted-foreground">Outcome:</span> {consultation.disposition.replace("_", " ")}
                  {consultation.referredTo && ` → ${dept(consultation.referredTo)}`}
                  {consultation.followUpDate && ` on ${consultation.followUpDate}`}
                </p>
                {consultation.notes && <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{consultation.notes}</p>}
                <p className="mt-1 text-xs text-muted-foreground">Seen by {doctor ?? "doctor"}</p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">Status: {visit.status}</p>
            )}
          </li>
        ))}
        {documents.length > 0 && (
          <li className="relative rounded-xl border border-dashed bg-card p-4">
            <span className="absolute -left-[33px] top-5 size-3 rounded-full bg-muted-foreground/40" />
            <p className="font-semibold">Digitised paper reports</p>
            <ul className="mt-1 text-sm">
              {documents.map((d) => (
                <li key={d.id}>
                  {d.docDate ?? "undated"} · {DOC[d.docType ?? ""] ?? "Document"}
                  {d.facility ? ` · ${d.facility}` : ""}
                </li>
              ))}
            </ul>
          </li>
        )}
      </ol>
    </div>
  );
}

export default function PatientPage({ params }: PageProps<"/patients/[id]">) {
  return (
    <main className="flex min-h-screen flex-col bg-muted/30">
      <AppHeader title="Patient history" />
      <Suspense fallback={<Loader2 className="m-10 animate-spin text-muted-foreground" />}>
        <History params={params} />
      </Suspense>
    </main>
  );
}
