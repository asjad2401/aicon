"use client";

import { useMemo, useState } from "react";
import { RotateCcw, Table2 } from "lucide-react";
import { TriageBadge } from "@/components/triage-badge";
import { DEFAULT_PARAMS, simulate, type SimParams, type SimResult } from "@/lib/sim";
import type { Colour } from "@/lib/triage/discriminators";
import { cn } from "@/lib/utils";

const COLOURS: Colour[] = ["RED", "ORANGE", "YELLOW", "GREEN"];
const TARGET_LABEL: Record<Colour, string> = { RED: "immediate", ORANGE: "10 min", YELLOW: "60 min", GREEN: "4 h" };

// Emphasis form: "today" in de-emphasis gray, Priora in the brand accent (validated pair, labels always on).
const TODAY = "#a8a29e";
const PRIORA = "#0f766e";

const fmtMin = (m: number) => (m < 1 ? "<1 min" : m < 60 ? `${Math.round(m)} min` : `${Math.floor(m / 60)}h ${Math.round(m % 60)}m`);
const pct = (x: number) => `${Math.round(x * 100)}%`;

function StatTile({ label, today, priora, note }: { label: string; today: string; priora: string; note?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-semibold text-foreground">{priora}</p>
      <p className="text-sm text-muted-foreground">
        today: <span className="font-medium text-foreground">{today}</span>
        {note && <span> · {note}</span>}
      </p>
    </div>
  );
}

type Metric = "medianWait" | "p90Wait";

/** Dumbbell: per triage colour, today's wait → Priora's wait. One axis, labels on every point. */
function Dumbbell({ base, priora, metric }: { base: SimResult; priora: SimResult; metric: Metric }) {
  const [hover, setHover] = useState<Colour | null>(null);
  const W = 720;
  const rowH = 64;
  const left = 150;
  const right = 40;
  const top = 28;
  const H = top + rowH * COLOURS.length + 28;
  const max = Math.max(...COLOURS.flatMap((c) => [base.byColour[c][metric], priora.byColour[c][metric]]), 10);
  const niceMax = Math.ceil(max / 30) * 30;
  const x = (m: number) => left + (m / niceMax) * (W - left - right);
  const ticks = Array.from({ length: 5 }, (_, i) => (niceMax / 4) * i);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Wait by triage colour, today versus Priora (${metric === "medianWait" ? "median" : "90th percentile"})`}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={top - 8} y2={H - 24} stroke="currentColor" className="text-border" strokeWidth={1} />
          <text x={x(t)} y={H - 8} textAnchor="middle" className="fill-muted-foreground text-[11px] tabular-nums">
            {fmtMin(t)}
          </text>
        </g>
      ))}
      {COLOURS.map((c, i) => {
        const y = top + rowH * i + rowH / 2;
        const a = base.byColour[c][metric];
        const b = priora.byColour[c][metric];
        const up = b > a;
        return (
          <g key={c} onMouseEnter={() => setHover(c)} onMouseLeave={() => setHover(null)}>
            {/* generous hit target for the whole row */}
            <rect x={0} y={y - rowH / 2} width={W} height={rowH} fill={hover === c ? "currentColor" : "transparent"} className="text-muted/60" />
            <text x={12} y={y + 4} className="fill-foreground text-[13px] font-semibold">
              {c}
            </text>
            <text x={12} y={y + 20} className="fill-muted-foreground text-[11px]">
              target {TARGET_LABEL[c]} · n={base.byColour[c].n}
            </text>
            <line x1={x(a)} x2={x(b)} y1={y} y2={y} stroke={up ? TODAY : PRIORA} strokeWidth={2} strokeOpacity={0.6} />
            <circle cx={x(a)} cy={y} r={7} fill={TODAY} stroke="var(--background)" strokeWidth={2} />
            <circle cx={x(b)} cy={y} r={7} fill={PRIORA} stroke="var(--background)" strokeWidth={2} />
            <text x={x(a)} y={y - 13} textAnchor="middle" className="fill-muted-foreground text-[11px] tabular-nums">
              {fmtMin(a)}
            </text>
            <text x={x(b)} y={y + 24} textAnchor="middle" className="fill-foreground text-[12px] font-semibold tabular-nums">
              {fmtMin(b)}
            </text>
            {hover === c && (
              <text x={W - right} y={y - 18} textAnchor="end" className="fill-foreground text-[11px]">
                within target: {pct(base.byColour[c].withinTarget)} today → {pct(priora.byColour[c].withinTarget)} with Priora
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  format = (v: number) => String(v),
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="flex justify-between">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{format(value)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="accent-[#0f766e]" />
    </label>
  );
}

export function Impact() {
  const [p, setP] = useState<SimParams>(DEFAULT_PARAMS);
  const [metric, setMetric] = useState<Metric>("medianWait");
  const [showTable, setShowTable] = useState(false);
  const set = (patch: Partial<SimParams>) => setP((prev) => ({ ...prev, ...patch }));

  const { base, priora } = useMemo(() => ({ base: simulate(p, "baseline"), priora: simulate(p, "priora") }), [p]);
  const savedHours = (base.doctorMinutesOnFiles - priora.doctorMinutesOnFiles) / 60;
  const endedEarlier = base.sessionEnd - priora.sessionEnd;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Impact: one OPD morning, simulated</h1>
        <p className="mt-1 max-w-3xl text-muted-foreground">
          {p.patients} patients arrive over {p.hours} hours to {p.doctors} doctors. The same synthetic patients go through
          today&apos;s single first-come line and through Priora. Only the process changes.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="RED patients: median wait" today={fmtMin(base.byColour.RED.medianWait)} priora={fmtMin(priora.byColour.RED.medianWait)} />
        <StatTile label="ORANGE seen within 10 min" today={pct(base.byColour.ORANGE.withinTarget)} priora={pct(priora.byColour.ORANGE.withinTarget)} />
        <StatTile label="Wrong-line redirects" today={String(base.redirects)} priora={String(priora.redirects)} note="AI routing" />
        <StatTile
          label="Doctor time on paper files"
          today={`${(base.doctorMinutesOnFiles / 60).toFixed(1)} h`}
          priora={`${(priora.doctorMinutesOnFiles / 60).toFixed(1)} h`}
          note={`${savedHours.toFixed(1)} h saved`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5"><span className="size-3 rounded-full" style={{ background: TODAY }} /> Today (single line)</span>
              <span className="flex items-center gap-1.5"><span className="size-3 rounded-full" style={{ background: PRIORA }} /> With Priora</span>
            </div>
            <div className="flex items-center gap-1 rounded-lg border p-0.5 text-sm">
              {(["medianWait", "p90Wait"] as const).map((m) => (
                <button key={m} onClick={() => setMetric(m)} className={cn("rounded-md px-3 py-1", metric === m ? "bg-muted font-medium" : "text-muted-foreground")}>
                  {m === "medianWait" ? "Median wait" : "90th percentile"}
                </button>
              ))}
              <button onClick={() => setShowTable((s) => !s)} className={cn("ml-1 rounded-md px-2 py-1", showTable ? "bg-muted" : "text-muted-foreground")} aria-label="Toggle table view">
                <Table2 className="size-4" />
              </button>
            </div>
          </div>

          {showTable ? (
            <table className="w-full text-sm tabular-nums">
              <thead className="text-left text-muted-foreground">
                <tr><th className="py-2">Colour</th><th>n</th><th>Median today</th><th>Median Priora</th><th>P90 today</th><th>P90 Priora</th><th>Within target today</th><th>Within target Priora</th></tr>
              </thead>
              <tbody>
                {COLOURS.map((c) => (
                  <tr key={c} className="border-t">
                    <td className="py-2"><TriageBadge colour={c} size="sm" /></td>
                    <td>{base.byColour[c].n}</td>
                    <td>{fmtMin(base.byColour[c].medianWait)}</td>
                    <td className="font-semibold">{fmtMin(priora.byColour[c].medianWait)}</td>
                    <td>{fmtMin(base.byColour[c].p90Wait)}</td>
                    <td className="font-semibold">{fmtMin(priora.byColour[c].p90Wait)}</td>
                    <td>{pct(base.byColour[c].withinTarget)}</td>
                    <td className="font-semibold">{pct(priora.byColour[c].withinTarget)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Dumbbell base={base} priora={priora} metric={metric} />
          )}

          <p className="mt-3 text-sm text-muted-foreground">
            Critical patients jump the line, and the session ends {endedEarlier > 0 ? `${Math.round(endedEarlier)} min earlier` : "at the same time"}{" "}
            because fewer patients re-queue and doctors spend less time on paper files.{" "}
            <strong className="text-foreground">Trade-off:</strong> GREEN patients wait{" "}
            {priora.byColour.GREEN.medianWait > base.byColour.GREEN.medianWait ? "longer" : "about the same"} (median{" "}
            {fmtMin(base.byColour.GREEN.medianWait)} → {fmtMin(priora.byColour.GREEN.medianWait)}), still{" "}
            {pct(priora.byColour.GREEN.withinTarget)} within their 4-hour target, with a fairness rule promoting anyone past it.
          </p>
        </div>

        <aside className="flex flex-col gap-4 rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase text-muted-foreground">Assumptions</p>
            <button onClick={() => setP(DEFAULT_PARAMS)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <RotateCcw className="size-3" /> Reset
            </button>
          </div>
          <Slider label="Patients" value={p.patients} min={100} max={600} step={10} onChange={(v) => set({ patients: v })} />
          <Slider label="Doctors" value={p.doctors} min={2} max={10} onChange={(v) => set({ doctors: v })} />
          <Slider label="Mean consult" value={p.consultMinutes} min={2} max={10} format={(v) => `${v} min`} onChange={(v) => set({ consultMinutes: v })} />
          <Slider label="Wrong-line rate today" value={p.misrouteBaseline} min={0} max={0.4} step={0.01} format={pct} onChange={(v) => set({ misrouteBaseline: v })} />
          <Slider label="Wrong-line rate, Priora" value={p.misroutePriora} min={0} max={0.2} step={0.001} format={(v) => `${(v * 100).toFixed(1)}%`} onChange={(v) => set({ misroutePriora: v })} />
          <Slider label="Patients carrying old files" value={p.withFiles} min={0} max={1} step={0.05} format={pct} onChange={(v) => set({ withFiles: v })} />
          <Slider label="File reading today" value={p.fileMinutesBaseline} min={0} max={8} step={0.5} format={(v) => `${v} min`} onChange={(v) => set({ fileMinutesBaseline: v })} />
          <Slider label="File reading with brief" value={p.fileMinutesPriora} min={0} max={8} step={0.5} format={(v) => `${v} min`} onChange={(v) => set({ fileMinutesPriora: v })} />
          <p className="text-xs text-muted-foreground">
            Colour mix 2% / 10% / 30% / 58% (RED→GREEN). Priora wrong-line rate defaults to the 3.6% department miss rate measured on our
            evaluation set. Simulation with synthetic data, seed {p.seed}.
          </p>
        </aside>
      </div>
    </div>
  );
}
