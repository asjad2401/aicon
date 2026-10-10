"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { AREAS, HOSPITALS, SYNDROMES, SYNDROME_BY_ID } from "@/lib/surveillance/config";
import type { Signal } from "@/lib/surveillance/detect";
import { cn } from "@/lib/utils";

// Leaflet touches `window`, so it only renders in the browser.
const LeafletMap = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[560px] items-center justify-center rounded-lg bg-muted/40">
      <Loader2 className="animate-spin text-muted-foreground" />
    </div>
  ),
});

/** District map on a real basemap: halos sized by 3-day cases, pulsing alerts, hospital nodes. */
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
  const forSyndrome = (area: string) => signals.find((s) => s.area === area && s.syndrome === syndrome);
  const areas = AREAS.map((a) => {
    const s = forSyndrome(a.id);
    return { id: a.id, name: a.name, lat: a.lat, lon: a.lon, cases: s?.last3 ?? 0, today: s?.today ?? 0, baseline: s?.baselineMean ?? 0, level: s?.level ?? null, score: s?.score ?? null };
  });
  const maxCases = Math.max(4, ...areas.map((a) => a.cases));
  const hospitals = HOSPITALS.map((h) => ({ id: h.id, name: h.name, lat: h.lat, lon: h.lon, intakes: network.find((n) => n.hospital === h.id)?.intakes ?? 0 }));
  const shownSyndromes = SYNDROMES.filter(
    (s) => ["dengue_like", "awd", "measles_like", "ili", "typhoid_like", "jaundice"].includes(s.id) || flagged.some((f) => f.syndrome === s.id),
  );

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">
          District map · {AREAS.length} areas · {HOSPITALS.length} hospitals · cases in the last 3 days
        </p>
        <div className="flex flex-wrap gap-1">
          {shownSyndromes.map((s) => {
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
      <LeafletMap
        key={syndrome}
        areas={areas}
        hospitals={hospitals}
        maxCases={maxCases}
        syndromeLabel={SYNDROME_BY_ID[syndrome].label}
        onSelect={onSelect ? (area) => onSelect(area, syndrome) : undefined}
      />
      <p className="mt-2 text-xs text-muted-foreground">
        Circle size and shade = cases in the last 3 days. Pulsing red = alert. <span className="font-semibold text-[#0f766e]">H</span> = hospital in the
        network (intakes over 30 days). Approximate positions; anonymous counts only. Map data © OpenStreetMap contributors.
      </p>
    </div>
  );
}
