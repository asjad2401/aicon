"use client";

import useSWR from "swr";
import { Loader2 } from "lucide-react";
import { DistrictMap } from "@/app/surveillance/district-map";
import { fetcher } from "@/lib/client/api";
import type { Signal } from "@/lib/surveillance/detect";

type Snapshot = { today: string; network: { hospital: string; intakes: number }[]; signals: Signal[] };

/** Public, read-only live snapshot of the district early-warning map (anonymous counts only). */
export function LiveDistrict() {
  const { data } = useSWR<Snapshot>("/api/public/district", fetcher, { refreshInterval: 60_000 });
  if (!data) {
    return (
      <div className="flex h-96 items-center justify-center rounded-xl border bg-card">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }
  return <DistrictMap signals={data.signals} network={data.network} />;
}
