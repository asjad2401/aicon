"use client";

import { notify } from "@/components/ui/matte-stack";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { Loader2, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReasonTrail } from "@/components/reason-trail";
import { TRIAGE_META, TriageBadge } from "@/components/triage-badge";
import { fetcher, formatWait, postJSON, type QueueEntry, type VisitDetail } from "@/lib/client/api";
import { DEPARTMENT_BY_ID, type DepartmentId } from "@/lib/routing/departments";
import { DISCRIMINATOR_BY_ID, type Colour } from "@/lib/triage/discriminators";
import { triage, type AVPU, type Mobility, type Vitals } from "@/lib/triage/sats";
import { cn } from "@/lib/utils";

const COLOURS: Colour[] = ["RED", "ORANGE", "YELLOW", "GREEN"];

export function Nurse() {
  const { data, mutate } = useSWR<{ items: QueueEntry[] }>("/api/queue?view=nurse", fetcher, {
    refreshInterval: 3000,
  });
  const [selected, setSelected] = useState<number | null>(null);
  const items = data?.items ?? [];

  return (
    <div className="grid flex-1 grid-cols-[340px_1fr] overflow-hidden">
      <aside className="flex flex-col overflow-y-auto border-r bg-card">
        <p className="border-b px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Awaiting vitals · {items.length}
        </p>
        {!data && <Loader2 className="m-6 animate-spin text-muted-foreground" />}
        {data && items.length === 0 && (
          <p className="p-6 text-sm text-muted-foreground">No patients waiting. New kiosk registrations appear here.</p>
        )}
        {items.map((v) => (
          <button
            key={v.id}
            onClick={() => setSelected(v.id)}
            className={cn(
              "flex flex-col gap-1 border-b border-l-4 px-4 py-3 text-left transition hover:bg-muted/50",
              TRIAGE_META[v.colour as Colour].edge,
              selected === v.id && "bg-accent",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-xl font-semibold tabular-nums">{v.tokenNo}</span>
              <TriageBadge colour={v.colour as Colour} size="sm" />
            </div>
            <span className="text-sm">{v.chiefComplaint}</span>
            <span className="text-xs text-muted-foreground">
              {v.age ?? "?"}
              {v.sex === "female" ? "F" : v.sex === "male" ? "M" : ""} · waited {formatWait(v.waitMinutes)}
              {v.overdue && <span className="ml-1 font-medium text-triage-red">· over target</span>}
            </span>
          </button>
        ))}
      </aside>

      <section className="overflow-y-auto p-6">
        {selected ? (
          <VitalsPanel
            key={selected}
            visitId={selected}
            onDone={() => {
              setSelected(null);
              void mutate();
            }}
          />
        ) : (
          <div className="mt-24 flex flex-col items-center gap-3 text-center">
            <span className="relative flex size-24 items-center justify-center rounded-full border border-dashed border-primary/30">
              <span className="absolute size-36 rounded-full border border-dashed border-primary/15" />
              <Stethoscope className="size-9 text-primary" />
            </span>
            <p className="font-display text-2xl">Pick the next patient</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Most urgent first. Record your own colour before the system&apos;s SATS result is shown: that blinded pair feeds clinical validation.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

type FormState = {
  rr: string;
  hr: string;
  sbp: string;
  temp: string;
  avpu: AVPU;
  mobility: Mobility;
  trauma: boolean;
};

const EMPTY: FormState = { rr: "", hr: "", sbp: "", temp: "", avpu: "alert", mobility: "walking", trauma: false };

function toVitals(f: FormState): Vitals {
  const num = (s: string) => (s.trim() === "" ? undefined : Number(s));
  return { rr: num(f.rr), hr: num(f.hr), sbp: num(f.sbp), temp: num(f.temp), avpu: f.avpu, mobility: f.mobility, trauma: f.trauma };
}

function VitalsPanel({ visitId, onDone }: { visitId: number; onDone: () => void }) {
  const { data: detail } = useSWR<VisitDetail>(`/api/visits/${visitId}`, fetcher);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [override, setOverride] = useState<Colour | "">("");
  // Validation: the nurse's own colour, chosen before the system's SATS result is revealed.
  const [nurseColour, setNurseColour] = useState<Colour | null>(null);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const intake = detail?.visit.intake;
  const vitals = toVitals(form);
  const complete = [form.rr, form.hr, form.sbp, form.temp].every((s) => s.trim() !== "");

  // Live preview: the same deterministic engine the server uses.
  const preview = useMemo(
    () =>
      intake
        ? triage({
            discriminatorIds: intake.discriminators.map((d) => d.id),
            painScore: intake.pain_score ?? undefined,
            age: detail?.patient.age ?? undefined,
            vitals,
          })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [intake, detail?.patient.age, form],
  );

  const evidence = useMemo(
    () =>
      Object.fromEntries(
        (intake?.discriminators ?? []).map((d) => {
          const disc = DISCRIMINATOR_BY_ID[d.id];
          return [`${disc.label} → ${disc.level}`, d.evidence];
        }),
      ),
    [intake],
  );

  if (!detail || !intake || !preview) return <Loader2 className="m-10 animate-spin text-muted-foreground" />;

  async function confirm() {
    setSaving(true);
    setError(null);
    try {
      await postJSON(`/api/visits/${visitId}/vitals`, {
        vitals,
        nurseColour,
        ...(override && { overrideColour: override, overrideReason: reason }),
      });
      notify({
        title: `${detail!.visit.tokenNo} triaged ${finalColour}`,
        description: `Sent to the ${dept?.name ?? "department"} queue`,
        tone: finalColour === "RED" ? "alert" : "success",
      });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
      setSaving(false);
    }
  }

  const finalColour = override || preview.colour;
  const dept = DEPARTMENT_BY_ID[detail.visit.department as DepartmentId];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tabular-nums">
            {detail.visit.tokenNo}{" "}
            <span className="text-base font-normal text-muted-foreground">
              {detail.patient.name ?? "Unnamed"} · {detail.patient.age ?? "?"}
              {detail.patient.sex === "female" ? "F" : detail.patient.sex === "male" ? "M" : ""}
            </span>
          </h2>
          <p className="text-sm text-muted-foreground">Routed to {dept.name}</p>
        </div>
        <TriageBadge colour={detail.visit.colour as Colour} />
      </div>

      <div className="rounded-xl border bg-card p-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">Patient&apos;s words</p>
        <p className={cn("mt-1 text-lg", intake.language === "urdu" && "font-urdu")} dir={intake.language === "urdu" ? "rtl" : "ltr"}>
          “{intake.transcript}”
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{intake.summary_en}</p>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <p className="mb-3 text-xs font-medium uppercase text-muted-foreground">Vitals</p>
        <div className="grid grid-cols-4 gap-3">
          {(
            [
              ["hr", "Heart rate", "/min"],
              ["rr", "Resp. rate", "/min"],
              ["sbp", "Systolic BP", "mmHg"],
              ["temp", "Temp", "°C"],
            ] as const
          ).map(([key, label, unit]) => (
            <label key={key} className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">{label}</span>
              <div className="flex items-center gap-1">
                <input
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value.replace(/[^\d.]/g, "") })}
                  inputMode="decimal"
                  className="h-11 w-full rounded-lg border px-3 text-lg tabular-nums"
                />
                <span className="text-xs text-muted-foreground">{unit}</span>
              </div>
            </label>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground">AVPU</span>
            <select value={form.avpu} onChange={(e) => setForm({ ...form, avpu: e.target.value as AVPU })} className="h-11 rounded-lg border px-2">
              <option value="alert">Alert</option>
              <option value="confused">Confused</option>
              <option value="voice">Reacts to voice</option>
              <option value="pain">Reacts to pain</option>
              <option value="unresponsive">Unresponsive</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground">Mobility</span>
            <select value={form.mobility} onChange={(e) => setForm({ ...form, mobility: e.target.value as Mobility })} className="h-11 rounded-lg border px-2">
              <option value="walking">Walking</option>
              <option value="with_help">With help</option>
              <option value="immobile">Stretcher / immobile</option>
            </select>
          </label>
          <label className="flex items-center gap-2 pt-6">
            <input type="checkbox" checked={form.trauma} onChange={(e) => setForm({ ...form, trauma: e.target.checked })} className="size-5" />
            Trauma
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">
          1 · Your clinical assessment <span className="normal-case">(before seeing the system&apos;s result)</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {COLOURS.map((c) => (
            <button
              key={c}
              type="button"
              disabled={!complete}
              onClick={() => setNurseColour(c)}
              className={cn("rounded-full border-2 p-0.5 disabled:opacity-40", nurseColour === c ? "border-foreground" : "border-transparent")}
            >
              <TriageBadge colour={c} size="sm" />
            </button>
          ))}
        </div>
        {!complete && <p className="text-xs text-muted-foreground">Enter all vitals first.</p>}
      </div>

      <div className={cn("rounded-xl border bg-card p-4", !nurseColour && "opacity-60")}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-medium uppercase text-muted-foreground">
            2 · SATS result {nurseColour && preview.tews != null && `· TEWS ${preview.tews}`}
          </p>
          {nurseColour && <TriageBadge colour={preview.colour} />}
        </div>
        {nurseColour ? (
          <>
            <p
              className={cn(
                "mb-3 rounded-md p-2 text-sm",
                nurseColour === preview.colour ? "bg-primary/10 text-primary" : "bg-triage-orange/10 text-triage-orange",
              )}
            >
              {nurseColour === preview.colour
                ? "Your assessment agrees with SATS."
                : `You chose ${nurseColour}; SATS computed ${preview.colour}. Review the reasons below, and override if your judgement differs.`}
            </p>
            <ReasonTrail reasons={preview.reasons} evidence={evidence} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Hidden until you record your own assessment (keeps the validation study unbiased).</p>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">3 · Override the final colour (optional, logged)</p>
        <div className="flex gap-2">
          {COLOURS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setOverride(override === c ? "" : c)}
              className={cn("rounded-full border-2 p-0.5", override === c ? "border-foreground" : "border-transparent")}
            >
              <TriageBadge colour={c} size="sm" />
            </button>
          ))}
        </div>
        {override && (
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for override (required)"
            className="h-10 rounded-lg border px-3 text-sm"
          />
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        className="h-14 text-lg"
        disabled={!complete || !nurseColour || saving || (!!override && reason.trim().length < 3)}
        onClick={confirm}
      >
        {saving ? <Loader2 className="animate-spin" /> : null}
        Confirm {finalColour}
        {finalColour === "RED" && detail.visit.department !== "emergency" && " → send to Emergency"}
      </Button>
    </div>
  );
}
