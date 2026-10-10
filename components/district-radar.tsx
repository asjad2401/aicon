"use client";

import useSWR from "swr";
import { AREAS, AREA_BY_ID, HOSPITALS, SYNDROME_BY_ID } from "@/lib/surveillance/config";
import { fetcher } from "@/lib/client/api";
import type { Signal } from "@/lib/surveillance/detect";

type Snapshot = { today: string; network: { hospital: string; intakes: number }[]; signals: Signal[] };

const SIZE = 440;
const C = SIZE / 2;
const POINTS = [...AREAS, ...HOSPITALS];
const LAT0 = (Math.min(...POINTS.map((p) => p.lat)) + Math.max(...POINTS.map((p) => p.lat))) / 2;
const LON0 = (Math.min(...POINTS.map((p) => p.lon)) + Math.max(...POINTS.map((p) => p.lon))) / 2;
const K = Math.cos((LAT0 * Math.PI) / 180);
const SPAN = Math.max(...POINTS.map((p) => Math.hypot((p.lon - LON0) * K, p.lat - LAT0)));
/** Project a lat/lon into the radar disc (equirectangular, north up). */
const xy = (lat: number, lon: number) => ({
  x: C + (((lon - LON0) * K) / SPAN) * (C - 34),
  y: C - ((lat - LAT0) / SPAN) * (C - 34),
});

export function useDistrictSnapshot() {
  return useSWR<Snapshot>("/api/public/district", fetcher, { refreshInterval: 60_000 });
}

/** Live radar of the district: every area as a blip, hospitals as squares, active alerts pinging. */
export function DistrictRadar() {
  const { data } = useDistrictSnapshot();
  const alerts = (data?.signals ?? []).filter((s) => s.level === "alert" && s.area !== "all");
  const alertAreas = new Set(alerts.map((a) => a.area));

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-auto w-full max-w-[440px]" role="img" aria-label="Live radar of the district with active outbreak alerts">
      <defs>
        <radialGradient id="radar-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#14423b" />
          <stop offset="100%" stopColor="#0e2420" />
        </radialGradient>
        <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7fd3c0" stopOpacity="0" />
          <stop offset="100%" stopColor="#7fd3c0" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <circle cx={C} cy={C} r={C - 2} fill="url(#radar-bg)" stroke="#f5f1e8" strokeOpacity="0.25" />
      {[0.25, 0.5, 0.75].map((f) => (
        <circle key={f} cx={C} cy={C} r={(C - 2) * f} fill="none" stroke="#f5f1e8" strokeOpacity="0.12" strokeDasharray="2 5" />
      ))}
      <line x1={C} y1={4} x2={C} y2={SIZE - 4} stroke="#f5f1e8" strokeOpacity="0.08" />
      <line x1={4} y1={C} x2={SIZE - 4} y2={C} stroke="#f5f1e8" strokeOpacity="0.08" />
      <g className="radar-sweep">
        <path d={`M ${C} ${C} L ${C} 2 A ${C - 2} ${C - 2} 0 0 1 ${C + (C - 2) * Math.sin(Math.PI / 4)} ${C - (C - 2) * Math.cos(Math.PI / 4)} Z`} fill="url(#sweep)" />
      </g>
      {AREAS.map((a) => {
        const p = xy(a.lat, a.lon);
        const hot = alertAreas.has(a.id);
        return (
          <g key={a.id}>
            {hot && <circle cx={p.x} cy={p.y} r={4} fill="none" stroke="#e5482d" strokeWidth={2} className="radar-ping" />}
            <circle cx={p.x} cy={p.y} r={hot ? 5.5 : 3} fill={hot ? "#e5482d" : "#7fd3c0"} fillOpacity={hot ? 1 : 0.7} />
            {hot && (
              <text x={p.x + 9} y={p.y + 4} fill="#f5f1e8" fontSize={12} fontFamily="var(--font-geist-mono)">
                {a.name}
              </text>
            )}
          </g>
        );
      })}
      {HOSPITALS.map((h) => {
        const p = xy(h.lat, h.lon);
        return <rect key={h.id} x={p.x - 3.5} y={p.y - 3.5} width={7} height={7} fill="none" stroke="#f5f1e8" strokeOpacity={0.75} strokeWidth={1.5} />;
      })}
      <text x={C} y={18} textAnchor="middle" fill="#f5f1e8" fillOpacity={0.45} fontSize={10} fontFamily="var(--font-geist-mono)" letterSpacing="0.15em">
        N
      </text>
    </svg>
  );
}

/** Scrolling strip of today's active district alerts. */
export function LiveTicker() {
  const { data } = useDistrictSnapshot();
  const alerts = (data?.signals ?? []).filter((s) => s.level === "alert" && s.area !== "all").sort((a, b) => b.score - a.score);
  const intakes = (data?.network ?? []).reduce((n, h) => n + h.intakes, 0);
  const items = data
    ? [
        ...alerts.map((s) => `▲ ${AREA_BY_ID[s.area as keyof typeof AREA_BY_ID]?.name ?? s.area} · ${SYNDROME_BY_ID[s.syndrome]?.label ?? s.syndrome} · ${s.last3} cases in 3 days`),
        `${data.network.length} hospitals reporting · ${intakes.toLocaleString()} kiosk intakes in 30 days`,
      ]
    : ["Connecting to the district network…"];
  const row = (key: string) => (
    <span key={key} className="flex shrink-0 items-center gap-10 pr-10">
      {items.map((t, i) => (
        <span key={i} className={t.startsWith("▲") ? "text-[#ff8a70]" : "text-[#f5f1e8]/70"}>
          {t}
        </span>
      ))}
    </span>
  );
  return (
    <div className="flex items-center gap-4 overflow-hidden border-y border-white/10 bg-black/20 py-2.5 font-mono text-xs tracking-wide">
      <span className="z-10 flex shrink-0 items-center gap-2 pl-6 font-semibold text-[#f5f1e8]">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-signal opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-signal" />
        </span>
        LIVE {data ? `· ${data.today}` : ""}
      </span>
      <div className="flex min-w-0 flex-1 overflow-hidden">
        <div className="marquee flex">
          {row("a")}
          {row("b")}
        </div>
      </div>
    </div>
  );
}
