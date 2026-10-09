"use client";

import useSWR from "swr";
import { CheckCircle2, FileText, Loader2, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReasonTrail } from "@/components/reason-trail";
import { TriageBadge } from "@/components/triage-badge";
import { fetcher, type VisitDetail } from "@/lib/client/api";
import { DEPARTMENT_BY_ID, type DepartmentId } from "@/lib/routing/departments";
import type { Colour } from "@/lib/triage/discriminators";
import { cn } from "@/lib/utils";

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border bg-card p-4", className)}>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

export function PatientCard({
  visitId,
  onCall,
  onSeen,
}: {
  visitId: number;
  onCall: () => void;
  onSeen: () => void;
}) {
  const { data: d } = useSWR<VisitDetail>(`/api/visits/${visitId}`, fetcher, { refreshInterval: 5000 });
  if (!d) return <Loader2 className="m-10 animate-spin text-muted-foreground" />;

  const { visit, patient } = d;
  const intake = visit.intake!;
  const result = visit.finalTriage ?? visit.provisionalTriage!;
  const v = visit.vitals;
  const specialty = visit.routing?.specialty ? DEPARTMENT_BY_ID[visit.routing.specialty as DepartmentId] : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">
            <span className="tabular-nums">{visit.tokenNo}</span> · {patient.name ?? "Unnamed"}{" "}
            <span className="text-lg font-normal text-muted-foreground">
              {patient.age ?? "?"}
              {patient.sex === "female" ? "F" : patient.sex === "male" ? "M" : ""}
            </span>
          </h2>
          <p className="text-sm text-muted-foreground">
            {intake.chief_complaint}
            {specialty && ` · after stabilisation → ${specialty.name}`}
          </p>
        </div>
        <TriageBadge colour={visit.colour as Colour} size="lg" />
      </div>

      <Section title={`Why ${visit.colour}${result.tews != null ? ` · TEWS ${result.tews}` : ""}${visit.finalTriage ? "" : " · provisional, vitals pending"}`}>
        <ReasonTrail reasons={result.reasons} />
        {visit.overrideColour && (
          <p className="mt-2 rounded-md bg-muted p-2 text-sm">
            Nurse override → {visit.overrideColour}: “{visit.overrideReason}”
          </p>
        )}
      </Section>

      <div className="grid grid-cols-2 gap-4">
        <Section title="Patient's words">
          <p className={cn(intake.language === "urdu" && "font-urdu text-lg")} dir={intake.language === "urdu" ? "rtl" : "ltr"}>
            “{intake.transcript}”
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{intake.summary_en}</p>
        </Section>
        <Section title="Vitals">
          {v ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm tabular-nums">
              <dt className="text-muted-foreground">HR</dt><dd>{v.hr}/min</dd>
              <dt className="text-muted-foreground">RR</dt><dd>{v.rr}/min</dd>
              <dt className="text-muted-foreground">SBP</dt><dd>{v.sbp} mmHg</dd>
              <dt className="text-muted-foreground">Temp</dt><dd>{v.temp}°C</dd>
              <dt className="text-muted-foreground">AVPU</dt><dd className="capitalize">{v.avpu}</dd>
              <dt className="text-muted-foreground">Mobility</dt><dd>{v.mobility?.replace("_", " ")}</dd>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">Not yet recorded by the triage nurse.</p>
          )}
        </Section>
      </div>

      <Section title="Pre-consultation brief · from patient's old reports">
        {d.facts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No reports on file. The patient can add old reports at the Records desk using their token QR.
          </p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {d.facts.map((f) => (
              <li key={f.id}>
                <span className="text-muted-foreground capitalize">{f.kind}:</span> {f.label}
                {f.value ? ` ${f.value}${f.unit ? ` ${f.unit}` : ""}` : ""}
                {f.date ? <span className="text-muted-foreground"> · {f.date}</span> : null}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
          <FileText className="size-3.5" /> {d.documents.length} document(s) · orientation only, verify at examination
        </p>
      </Section>

      <Section title="Routing">
        <ul className="list-disc pl-5 text-sm">
          {visit.routing?.reasons.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </Section>

      <div className="flex gap-3">
        {visit.status !== "called" && (
          <Button variant="outline" className="h-12 flex-1" onClick={onCall}>
            <PhoneCall /> Call this patient
          </Button>
        )}
        <Button className="h-12 flex-1" onClick={onSeen}>
          <CheckCircle2 /> Mark seen
        </Button>
      </div>
    </div>
  );
}
