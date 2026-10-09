import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import QRCode from "qrcode";
import { Loader2 } from "lucide-react";
import { getDb, schema } from "@/lib/db";
import { DEPARTMENT_BY_ID, type DepartmentId } from "@/lib/routing/departments";
import type { Colour } from "@/lib/triage/discriminators";
import { TriageBadge } from "@/components/triage-badge";
import { PrintButton } from "./print-button";

const SITE_URL = process.env.SITE_URL ?? "https://priora.asjad.dev";

async function TokenSlip({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const visitId = Number(id);
  if (!Number.isInteger(visitId)) notFound();

  const db = getDb();
  const [row] = await db
    .select({ visit: schema.visits, patient: schema.patients })
    .from(schema.visits)
    .innerJoin(schema.patients, eq(schema.visits.patientId, schema.patients.id))
    .where(eq(schema.visits.id, visitId));
  if (!row) notFound();

  const { visit, patient } = row;
  const dept = DEPARTMENT_BY_ID[visit.department as DepartmentId];
  const qrSvg = await QRCode.toString(`${SITE_URL}/p/${patient.passportToken}`, {
    type: "svg",
    margin: 0,
    width: 160,
  });

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl border bg-card p-8 text-center shadow-sm print:border-0 print:shadow-none">
      <span className="text-lg font-semibold text-brand">Priora</span>
      <div>
        <p className="text-sm text-muted-foreground">Token · <span className="font-urdu">ٹوکن</span></p>
        <p className="text-6xl font-bold tabular-nums tracking-tight">{visit.tokenNo}</p>
      </div>
      <TriageBadge colour={visit.colour as Colour} size="lg" />
      <div>
        <p className="text-muted-foreground">Go to the triage nurse, then</p>
        <p className="text-2xl font-semibold">{dept.name}</p>
        <p className="font-urdu text-2xl">{dept.urdu}</p>
      </div>
      <div className="size-40" dangerouslySetInnerHTML={{ __html: qrSvg }} />
      <p className="-mt-3 font-mono text-sm tracking-widest">{patient.passportToken}</p>
      <p className="text-xs text-muted-foreground">
        Health passport: show this QR at every visit · <span className="font-urdu">ہر بار یہ کیو آر دکھائیں</span>
      </p>
      <p className="text-xs text-muted-foreground tabular-nums">
        {patient.name ? `${patient.name} · ` : ""}
        {patient.age ?? "?"} {patient.sex === "female" ? "F" : patient.sex === "male" ? "M" : ""} ·{" "}
        {visit.arrivedAt.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Karachi" })}
      </p>
      <div className="flex gap-3 print:hidden">
        <PrintButton />
        <Link href={`/records?code=${patient.passportToken}`} className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">
          Add old reports
        </Link>
        <Link href="/kiosk" className="rounded-lg border px-4 py-2 text-sm hover:bg-muted">
          New patient
        </Link>
      </div>
    </div>
  );
}

export default function TokenPage({ params }: PageProps<"/token/[id]">) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6 print:bg-white">
      <Suspense fallback={<Loader2 className="size-10 animate-spin text-primary" />}>
        <TokenSlip params={params} />
      </Suspense>
    </main>
  );
}
