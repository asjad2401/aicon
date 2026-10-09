"use client";

import { useState } from "react";
import useSWR from "swr";
import { AlertTriangle, Eye, Loader2, ShieldCheck } from "lucide-react";
import { fetcher } from "@/lib/client/api";
import { AREAS, AREA_BY_ID, SYNDROMES, SYNDROME_BY_ID, type AreaId } from "@/lib/surveillance/config";
import type { Level, Signal } from "@/lib/surveillance/detect";
import { cn } from "@/lib/utils";

type SurveillanceData = {
  today: string;
  days: string[];
  signals: Signal[];
  patientsAnalysed: number;
  syndromeCases: number;
};

type BriefResponse = {
  brief: {
    headline: string;
    evidence: { text: string; stat_ids: string[] }[];
    who_is_affected: string;
    actions: { id: string; text: string; why: string }[];
    caveats: string[];
  };
  stats: { id: string; text: string }[];
};

const areaName = (id: string) => (id === "all" ? "All areas" : (AREA_BY_ID[id as AreaId]?.name ?? id));
const fmtDate = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

// Sequential teal ramp for counts (one hue, light → dark); every cell also prints its number.
function heat(count: number) {
  if (count === 0) return "bg-muted/60 text-muted-foreground/50";
  if (count === 1) return "bg-[#ccfbf1] text-foreground";
  if (count <= 3) return "bg-[#5eead4] text-foreground";
  if (count <= 6) return "bg-[#14b8a6] text-white";
  return "bg-[#0f766e] text-white";
}

function LevelBadge({ level }: { level: Level }) {
  if (!level) return null;
  return level === "alert" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-triage-red px-2 py-0.5 text-xs font-semibold text-white">
      <AlertTriangle className="size-3" /> ALERT
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-triage-yellow px-2 py-0.5 text-xs font-semibold text-white">
      <Eye className="size-3" /> WATCH
    </span>
  );
}

/** 30-day daily counts (bars), baseline mean (dashed), alert/watch days marked. */
function TrendChart({ signal }: { signal: Signal }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 720, H = 220, left = 32, right = 12, top = 18, bottom = 28;
  const n = signal.series.length;
  const max = Math.max(4, ...signal.series.map((p) => p.count));
  const bw = (W - left - right) / n;
  const y = (v: number) => top + (1 - v / max) * (H - top - bottom);
  const ticks = [0, Math.round(max / 2), max];
  const hp = hover != null ? signal.series[hover] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Daily ${SYNDROME_BY_ID[signal.syndrome].label} cases in ${areaName(signal.area)}, last 30 days`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={left} x2={W - right} y1={y(t)} y2={y(t)} stroke="currentColor" className="text-border" strokeWidth={1} />
            <text x={left - 6} y={y(t) + 4} textAnchor="end" className="fill-muted-foreground text-[10px] tabular-nums">{t}</text>
          </g>
        ))}
        {signal.series.map((p, i) => (
          <g key={p.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <rect x={left + i * bw} y={top} width={bw} height={H - top - bottom} fill="transparent" />
            <rect
              x={left + i * bw + 1}
              y={y(p.count)}
              width={Math.max(bw - 2, 1)}
              height={Math.max(H - bottom - y(p.count), 0)}
              rx={2}
              fill="#0f766e"
              opacity={hover == null || hover === i ? 1 : 0.55}
            />
            {p.level && (
              <text x={left + i * bw + bw / 2} y={y(p.count) - 4} textAnchor="middle" className={cn("text-[10px]", p.level === "alert" ? "fill-triage-red" : "fill-triage-yellow")}>
                {p.level === "alert" ? "▲" : "●"}
              </text>
            )}
            {i % 5 === 4 && (
              <text x={left + i * bw + bw / 2} y={H - 10} textAnchor="middle" className="fill-muted-foreground text-[10px]">{fmtDate(p.date)}</text>
            )}
          </g>
        ))}
        <line x1={left} x2={W - right} y1={y(signal.baselineMean)} y2={y(signal.baselineMean)} stroke="#64748b" strokeDasharray="5 4" strokeWidth={1.5} />
        <text x={left + 4} y={y(signal.baselineMean) - 5} textAnchor="start" className="fill-muted-foreground text-[10px]">baseline {signal.baselineMean}/day</text>
      </svg>
      {hp && (
        <div className="pointer-events-none absolute right-2 top-0 rounded-md border bg-background px-2 py-1 text-xs shadow-sm">
          <span className="font-medium">{fmtDate(hp.date)}</span>: {hp.count} case{hp.count === 1 ? "" : "s"}
          {hp.score != null && <span className="text-muted-foreground"> · score {hp.score}</span>}
          {hp.level && <span className={hp.level === "alert" ? " text-triage-red" : " text-triage-yellow"}> · {hp.level}</span>}
        </div>
      )}
    </div>
  );
}

function AlertBrief({ signal }: { signal: Signal }) {
  const { data, error, isLoading } = useSWR<BriefResponse>(
    ["brief", signal.area, signal.syndrome, signal.today],
    () =>
      fetch("/api/surveillance/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area: signal.area, syndrome: signal.syndrome }),
      }).then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error);
        return r.json();
      }),
    { revalidateOnFocus: false },
  );
  if (isLoading) return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> AI is drafting the early-warning brief…</p>;
  if (error || !data) return <p className="text-sm text-destructive">{error?.message ?? "Could not generate the brief"}</p>;

  const stat = new Map(data.stats.map((s) => [s.id, s.text]));
  const b = data.brief;
  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className="text-base font-medium">{b.headline}</p>
      <ul className="flex flex-col gap-1">
        {b.evidence.map((e, i) => (
          <li key={i}>
            {e.text}{" "}
            {e.stat_ids.map((id) => (
              <span key={id} title={stat.get(id)} className="cursor-help rounded bg-primary/10 px-1 text-[11px] font-semibold text-primary">
                {id}
              </span>
            ))}
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground">{b.who_is_affected}</p>
      <div>
        <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Recommended response (from the standard checklist)</p>
        <ol className="flex list-decimal flex-col gap-1 pl-5">
          {b.actions.map((a) => (
            <li key={a.id}>
              <span className="font-medium">{a.text}</span> <span className="text-muted-foreground">: {a.why}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
        <span className="font-semibold">Caveats: </span>
        {b.caveats.join(" ")}
      </div>
    </div>
  );
}

export function Surveillance() {
  const { data } = useSWR<SurveillanceData>("/api/surveillance", fetcher, { refreshInterval: 30_000 });
  const [selected, setSelected] = useState<{ area: string; syndrome: string } | null>(null);

  if (!data) return <Loader2 className="m-10 animate-spin text-muted-foreground" />;

  const areaSignals = data.signals.filter((s) => s.area !== "all");
  const flagged = areaSignals.filter((s) => s.level).sort((a, b) => (a.level === b.level ? b.score - a.score : a.level === "alert" ? -1 : 1));
  const alerts = flagged.filter((s) => s.level === "alert");
  const current =
    data.signals.find((s) => s.area === selected?.area && s.syndrome === selected?.syndrome) ?? flagged[0] ?? null;
  const cell = (area: string, syndrome: string) => areaSignals.find((s) => s.area === area && s.syndrome === syndrome);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">District early warning</h1>
        <p className="mt-1 max-w-3xl text-muted-foreground">
          Every kiosk intake is tagged with WHO-style syndromes by AI. Daily counts per area are compared with a 7-day baseline (CDC EARS
          method) to flag unusual clusters <strong className="text-foreground">before lab confirmation</strong>. Anonymous counts only.
          Signals are for investigation, not confirmed outbreaks.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Areas monitored", String(AREAS.length)],
          ["Syndrome cases, last 30 days", data.syndromeCases.toLocaleString()],
          ["Active alerts", String(alerts.length)],
          ["On watch", String(flagged.length - alerts.length)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-card p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {flagged.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="flex flex-col gap-2">
            {flagged.map((s) => {
              const active = current?.area === s.area && current?.syndrome === s.syndrome;
              return (
                <button
                  key={`${s.area}-${s.syndrome}`}
                  onClick={() => setSelected({ area: s.area, syndrome: s.syndrome })}
                  className={cn(
                    "flex flex-col gap-1 rounded-xl border bg-card p-4 text-left transition hover:border-primary",
                    active && "border-primary ring-2 ring-primary/20",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <LevelBadge level={s.level} />
                    <span className="text-xs text-muted-foreground">score {s.score}</span>
                  </div>
                  <p className="font-semibold">
                    {SYNDROME_BY_ID[s.syndrome].label} · {areaName(s.area)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {s.today} today vs ~{s.baselineMean}/day · {s.last3} in 3 days
                  </p>
                </button>
              );
            })}
          </div>

          {current && (
            <div className="flex flex-col gap-4 rounded-xl border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xl font-semibold">
                    {SYNDROME_BY_ID[current.syndrome].label} · {areaName(current.area)}
                  </p>
                  <p className="text-sm text-muted-foreground">Possible cause to investigate: {SYNDROME_BY_ID[current.syndrome].concern}</p>
                </div>
                <LevelBadge level={current.level} />
              </div>
              <TrendChart signal={current} />
              <AlertBrief key={`${current.area}-${current.syndrome}`} signal={current} />
            </div>
          )}
        </div>
      ) : (
        <p className="flex items-center gap-2 rounded-xl border bg-card p-5 text-muted-foreground">
          <ShieldCheck className="size-5 text-primary" /> No unusual clusters today.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border bg-card p-4">
        <p className="mb-3 text-xs font-medium uppercase text-muted-foreground">Cases in the last 3 days · area × syndrome</p>
        <table className="w-full border-separate border-spacing-1 text-center text-sm tabular-nums">
          <thead>
            <tr>
              <th />
              {SYNDROMES.map((s) => (
                <th key={s.id} className="px-1 pb-1 text-[11px] font-medium leading-tight text-muted-foreground">{s.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {AREAS.map((a) => (
              <tr key={a.id}>
                <th className="whitespace-nowrap pr-2 text-left text-xs font-medium">
                  {a.name} <span className="font-normal text-muted-foreground">{a.city === "Rawalpindi" ? "RWP" : "ISB"}</span>
                </th>
                {SYNDROMES.map((s) => {
                  const sig = cell(a.id, s.id);
                  const n = sig?.last3 ?? 0;
                  return (
                    <td key={s.id} className="p-0">
                      <button
                        onClick={() => sig && setSelected({ area: a.id, syndrome: s.id })}
                        title={`${a.name} · ${s.label}: ${n} in 3 days${sig?.level ? ` · ${sig.level.toUpperCase()}` : ""}`}
                        className={cn(
                          "relative h-9 w-full min-w-10 rounded-md text-xs font-semibold",
                          heat(n),
                          sig?.level === "alert" && "ring-2 ring-triage-red ring-offset-1",
                          sig?.level === "watch" && "ring-2 ring-triage-yellow ring-offset-1",
                        )}
                      >
                        {n}
                        {sig?.level === "alert" && <span className="absolute -right-1 -top-1 text-[10px] text-triage-red">▲</span>}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted-foreground">
          Darker = more cases. Red ring ▲ = alert (score ≥ 3 and ≥ 3 cases today). Amber ring = watch. Click any cell for its trend.
        </p>
      </div>
    </div>
  );
}
