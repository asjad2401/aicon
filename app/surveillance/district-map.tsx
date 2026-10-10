"use client";

import { useState } from "react";
import { AREAS, HOSPITALS, SYNDROMES, SYNDROME_BY_ID } from "@/lib/surveillance/config";
import type { Signal } from "@/lib/surveillance/detect";
import { cn } from "@/lib/utils";

/**
 * Schematic district map (approximate coordinates, equirectangular): each area is a halo sized by
 * cases in the last 3 days for the chosen syndrome; alerts pulse red; hospitals are network nodes.
 */
const BOUNDS = { latMin: 33.565, latMax: 33.75, lonMin: 72.975, lonMax: 73.2 };
// Hospital label placement (dx, dy, anchor) so labels don't collide with nearby areas.
const LABEL: Record<string, [number, number, "start" | "end"]> = {
  pims: [-14, 4, "end"],
  polyclinic: [14, -12, "start"],
  hfh: [14, -10, "start"],
  bbh: [14, 16, "start"],
};
const W = 760;
const H = 600;
const project = (lat: number, lon: number) => ({
  x: 30 + ((lon - BOUNDS.lonMin) / (BOUNDS.lonMax - BOUNDS.lonMin)) * (W - 60),
  y: 30 + ((BOUNDS.latMax - lat) / (BOUNDS.latMax - BOUNDS.latMin)) * (H - 60),
});

export function DistrictMap({
  signals,
  network,
  onSelect,
}: {
  signals: (Signal & { hospitals?: { hospital: string; count: number }[] })[];
  network: { hospital: string; intakes: number }[];
  /** Omit for the public read-only snapshot. */
  onSelect?: (area: string, syndrome: string) => void;
}) {
  const flagged = signals.filter((s) => s.level && s.area !== "all").sort((a, b) => b.score - a.score);
  const [syndrome, setSyndrome] = useState<string>(flagged[0]?.syndrome ?? "dengue_like");
  const [hover, setHover] = useState<string | null>(null);
  const forSyndrome = (area: string) => signals.find((s) => s.area === area && s.syndrome === syndrome);
  const maxCases = Math.max(4, ...AREAS.map((a) => forSyndrome(a.id)?.last3 ?? 0));
  const hovered = hover ? AREAS.find((a) => a.id === hover) : null;
  const hs = hover ? forSyndrome(hover) : null;
  const intakes = (id: string) => network.find((n) => n.hospital === id)?.intakes ?? 0;

  const islamabad = project(33.735, 73.0);
  const rawalpindi = project(33.585, 73.0);

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">District map · cases in the last 3 days</p>
        <div className="flex flex-wrap gap-1">
          {SYNDROMES.filter((s) => ["dengue_like", "awd", "ili", "typhoid_like", "jaundice", "measles_like"].includes(s.id)).map((s) => {
            const alert = flagged.some((f) => f.syndrome === s.id && f.level === "alert");
            return (
              <button
                key={s.id}
                onClick={() => setSyndrome(s.id)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs",
                  syndrome === s.id ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted",
                  alert && "border-triage-red/60",
                )}
              >
                {alert && <span className="mr-1 text-triage-red">▲</span>}
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg bg-muted/40" role="img" aria-label={`Map of ${SYNDROME_BY_ID[syndrome].label} cases by area`}>
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0H0V40" fill="none" stroke="currentColor" className="text-border" strokeWidth="0.6" />
            </pattern>
          </defs>
          <rect width={W} height={H} fill="url(#grid)" />
          <text x={islamabad.x} y={islamabad.y} className="fill-muted-foreground/60 text-[13px] font-semibold uppercase tracking-[0.3em]">Islamabad</text>
          <text x={rawalpindi.x} y={rawalpindi.y} className="fill-muted-foreground/60 text-[13px] font-semibold uppercase tracking-[0.3em]">Rawalpindi</text>

          {/* Network links: every hospital reports into the district view */}
          {HOSPITALS.map((h, i) => {
            const a = project(h.lat, h.lon);
            return HOSPITALS.slice(i + 1).map((k) => {
              const b = project(k.lat, k.lon);
              return <line key={`${h.id}-${k.id}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#0f766e" strokeOpacity={0.15} strokeWidth={1.5} strokeDasharray="3 5" />;
            });
          })}

          {/* Area halos */}
          {AREAS.map((a) => {
            const s = forSyndrome(a.id);
            const n = s?.last3 ?? 0;
            const p = project(a.lat, a.lon);
            const r = 9 + Math.sqrt(n / maxCases) * 30;
            const level = s?.level;
            return (
              <g
                key={a.id}
                onMouseEnter={() => setHover(a.id)}
                onMouseLeave={() => setHover(null)}
                onClick={() => s && onSelect?.(a.id, syndrome)}
                className={s && onSelect ? "cursor-pointer" : ""}
              >
                {level === "alert" && (
                  <circle cx={p.x} cy={p.y} r={r + 6} fill="none" stroke="#dc2626" strokeWidth={2.5}>
                    <animate attributeName="r" values={`${r + 4};${r + 16};${r + 4}`} dur="2s" repeatCount="indefinite" />
                    <animate attributeName="stroke-opacity" values="0.9;0.15;0.9" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={r}
                  fill={n === 0 ? "#cbd5e1" : "#0f766e"}
                  fillOpacity={n === 0 ? 0.35 : 0.2 + 0.6 * (n / maxCases)}
                  stroke={level === "alert" ? "#dc2626" : level === "watch" ? "#ca8a04" : "#ffffff"}
                  strokeWidth={level ? 2.5 : 1.5}
                />
                <text x={p.x} y={p.y + 4} textAnchor="middle" className={cn("text-[12px] font-semibold tabular-nums", n / maxCases > 0.55 ? "fill-white" : "fill-foreground")}>
                  {n}
                </text>
                <text x={p.x} y={p.y + r + 13} textAnchor="middle" className="fill-foreground text-[11px]" paintOrder="stroke" stroke="#ffffff" strokeWidth={3}>
                  {a.name}
                  {level === "alert" ? " ▲" : ""}
                </text>
              </g>
            );
          })}

          {/* Hospitals */}
          {HOSPITALS.map((h) => {
            const p = project(h.lat, h.lon);
            return (
              <g key={h.id}>
                <rect x={p.x - 9} y={p.y - 9} width={18} height={18} rx={4} fill="#ffffff" stroke="#0f766e" strokeWidth={2} />
                <text x={p.x} y={p.y + 4.5} textAnchor="middle" className="fill-[#0f766e] text-[12px] font-bold">H</text>
                <text
                  x={p.x + LABEL[h.id][0]}
                  y={p.y + LABEL[h.id][1]}
                  textAnchor={LABEL[h.id][2]}
                  className="fill-[#0f766e] text-[10px] font-semibold"
                  paintOrder="stroke"
                  stroke="#ffffff"
                  strokeWidth={3}
                >
                  {h.name} · {intakes(h.id)}
                </text>
              </g>
            );
          })}
        </svg>

        {hovered && (
          <div className="pointer-events-none absolute left-3 top-3 rounded-md border bg-background px-3 py-2 text-xs shadow-sm">
            <p className="font-semibold">
              {hovered.name}, {hovered.city}
            </p>
            <p>
              {SYNDROME_BY_ID[syndrome].label}: {hs?.last3 ?? 0} in 3 days · {hs?.today ?? 0} today (baseline ~{hs?.baselineMean ?? 0}/day)
            </p>
            {hs?.level && (
              <p className={hs.level === "alert" ? "text-triage-red" : "text-triage-yellow"}>
                {hs.level.toUpperCase()} · score {hs.score} · {onSelect ? "click for the brief" : "health officers see the AI brief"}
              </p>
            )}
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Halo size and shade = cases in the last 3 days. Pulsing red = alert. <span className="font-semibold text-[#0f766e]">H</span> = hospital in the
        network, with its intakes over 30 days. Schematic positions, anonymous counts only.
      </p>
    </div>
  );
}
