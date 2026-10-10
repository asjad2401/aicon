"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { DEFAULT_LEADTIME, runLeadTime, type LeadTimeParams } from "@/lib/surveillance/leadtime";

const pct = (x: number) => `${Math.round(x * 100)}%`;
// Emphasis form: bars where Priora is earlier in the brand accent; where today's system is earlier in gray.
const EARLIER = "#0f766e";
const LATER = "#a8a29e";

function Tile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-semibold">{value}</p>
      <p className="text-sm text-muted-foreground">{note}</p>
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange, source }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; source?: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="flex justify-between">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{pct(value)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="accent-[#0f766e]" />
      {source && <span className="text-[11px] text-muted-foreground">{source}</span>}
    </label>
  );
}

/** Histogram of lead time (days Priora detected before today's system). One axis, labelled bars. */
function LeadHistogram({ data }: { data: { days: number; count: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const clipped = new Map<number, number>();
  for (const d of data) {
    const k = Math.max(-14, Math.min(28, d.days));
    clipped.set(k, (clipped.get(k) ?? 0) + d.count);
  }
  const bins = Array.from({ length: 43 }, (_, i) => i - 14).map((days) => ({ days, count: clipped.get(days) ?? 0 }));
  const max = Math.max(...bins.map((b) => b.count), 1);
  const W = 720, H = 200, left = 8, right = 8, top = 18, bottom = 30;
  const bw = (W - left - right) / bins.length;
  const x0 = left + 14 * bw;
  const hb = hover != null ? bins[hover] : null;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Distribution of detection lead time across simulated outbreaks">
        {bins.map((b, i) => {
          const h = (b.count / max) * (H - top - bottom);
          return (
            <g key={b.days} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={left + i * bw} y={top} width={bw} height={H - top - bottom} fill="transparent" />
              <rect x={left + i * bw + 1} y={H - bottom - h} width={Math.max(bw - 2, 1)} height={h} rx={2} fill={b.days > 0 ? EARLIER : LATER} opacity={hover == null || hover === i ? 1 : 0.5} />
            </g>
          );
        })}
        <line x1={x0} x2={x0} y1={top - 6} y2={H - bottom} stroke="#64748b" strokeDasharray="4 3" />
        <text x={x0 + 4} y={top - 4} className="fill-muted-foreground text-[10px]">same day</text>
        {[-14, -7, 0, 7, 14, 21, 28].map((d) => (
          <text key={d} x={left + (d + 14) * bw + bw / 2} y={H - 12} textAnchor="middle" className="fill-muted-foreground text-[10px] tabular-nums">
            {d === 28 ? "28+" : d === -14 ? "−14" : d > 0 ? `+${d}` : d}
          </text>
        ))}
        <text x={W - right} y={H - 1} textAnchor="end" className="fill-muted-foreground text-[10px]">Priora earlier →</text>
        <text x={left} y={H - 1} className="fill-muted-foreground text-[10px]">← today earlier</text>
      </svg>
      {hb && (
        <div className="pointer-events-none absolute right-2 top-0 rounded-md border bg-background px-2 py-1 text-xs shadow-sm">
          {hb.count} outbreak{hb.count === 1 ? "" : "s"}: {hb.days === 0 ? "detected the same day" : hb.days > 0 ? `Priora ${hb.days} day${hb.days === 1 ? "" : "s"} earlier` : `today ${-hb.days} day${hb.days === -1 ? "" : "s"} earlier`}
        </div>
      )}
    </div>
  );
}

export function LeadTime() {
  const [p, setP] = useState<LeadTimeParams>({ ...DEFAULT_LEADTIME, scenarios: 1000 });
  const set = (patch: Partial<LeadTimeParams>) => setP((prev) => ({ ...prev, ...patch }));
  const s = useMemo(() => runLeadTime(p), [p]);

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6 pt-0">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Outbreak early warning: how many days earlier?</h2>
        <p className="mt-1 max-w-3xl text-muted-foreground">
          {p.scenarios} simulated outbreaks in a {p.areas}-area district. <strong className="text-foreground">Priora</strong> watches AI-tagged symptoms
          from kiosk intake every day. <strong className="text-foreground">Today</strong>, an outbreak shows up only through lab-confirmed cases in
          weekly reports, and a quarter of those reports arrive late.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Median warning lead" value={s.medianLeadDays == null ? "n/a" : `${s.medianLeadDays} days`} note={s.leadIqr ? `middle half: ${s.leadIqr[0]} to ${s.leadIqr[1]} days` : ""} />
        <Tile label="Outbreaks caught within 2 weeks" value={pct(s.prioraDetectedWithin14)} note={`today: ${pct(s.todayDetectedWithin14)}`} />
        <Tile label="Median day of detection" value={s.prioraMedianDay == null ? "n/a" : `day ${s.prioraMedianDay}`} note={`today: ${s.todayMedianDay == null ? "not detected" : `day ${s.todayMedianDay}`}`} />
        <Tile label="Priora false alarms" value={`${(s.prioraFalseAlarmsPerAreaMonth * p.areas).toFixed(2)} / month`} note={`across the whole ${p.areas}-area district`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="rounded-xl border bg-card p-5">
          <p className="mb-2 text-sm font-medium">Lead time across outbreaks: days Priora alerted before lab-confirmed reporting</p>
          <LeadHistogram data={s.leadHistogram} />
          <p className="mt-2 text-sm text-muted-foreground">
            Priora is earlier in most outbreaks; slow-growing ones can still be caught first by lab reports (gray). It needs real kiosk coverage:
            below roughly 40% of care-seeking patients, the advantage disappears. That&apos;s why the pilot targets the district&apos;s largest OPDs.
          </p>
        </div>
        <aside className="flex flex-col gap-4 rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase text-muted-foreground">Assumptions</p>
            <button onClick={() => setP({ ...DEFAULT_LEADTIME, scenarios: 1000 })} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              <RotateCcw className="size-3" /> Reset
            </button>
          </div>
          <Slider label="Patients passing a Priora kiosk" value={p.coverage} min={0.1} max={1} step={0.05} onChange={(v) => set({ coverage: v })} />
          <Slider label="AI syndrome-tagging recall" value={p.sensitivity} min={0.4} max={1} step={0.01} onChange={(v) => set({ sensitivity: v })} source="Default 87%: measured on our 44-case syndrome evaluation" />
          <Slider label="Suspected cases lab-tested" value={p.testingRate} min={0.05} max={1} step={0.05} onChange={(v) => set({ testingRate: v })} />
          <Slider
            label="Weekly surveillance reports on time"
            value={p.reportCompliance}
            min={0.3}
            max={1}
            step={0.05}
            onChange={(v) => set({ reportCompliance: v })}
            source="Default 75%: NIH Pakistan IDSR bulletin, week 44-2025"
          />
          <p className="text-xs text-muted-foreground">
            Outbreaks double every 3–7 days; lab results take 1–3 days; weekly reports are compiled 3 days after the week ends. Simulation
            with stated assumptions, not observed data. Priora&apos;s alert rule is the same EARS check the live system runs.
          </p>
        </aside>
      </div>
    </section>
  );
}
