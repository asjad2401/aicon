"use client";

import { notify } from "@/components/ui/matte-stack";
import { useState } from "react";
import useSWR from "swr";
import { Loader2, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TRIAGE_META, TriageBadge } from "@/components/triage-badge";
import { fetcher, formatWait, postJSON, type QueueEntry } from "@/lib/client/api";
import type { DepartmentId } from "@/lib/routing/departments";
import type { Colour } from "@/lib/triage/discriminators";
import { cn } from "@/lib/utils";
import { PatientCard } from "./patient-card";

function Sla({ minutes, colour }: { minutes: number; colour: Colour }) {
  if (colour === "RED") return <span className="font-semibold text-triage-red">now</span>;
  if (minutes < 0) return <span className="font-semibold text-triage-red">{formatWait(-minutes)} over</span>;
  return <span className="text-muted-foreground">{formatWait(minutes)} left</span>;
}

export function DoctorQueue({ department, initialVisit }: { department: DepartmentId; initialVisit: number | null }) {
  const { data, mutate } = useSWR<{ items: QueueEntry[] }>(`/api/queue?dept=${department}`, fetcher, {
    refreshInterval: 3000,
  });
  const [selected, setSelected] = useState<number | null>(initialVisit);
  const [calling, setCalling] = useState(false);

  const items = data?.items ?? [];
  const inRoom = items.filter((v) => v.status === "called");
  const waiting = items.filter((v) => v.status !== "called");

  async function act(id: number, action: "call" | "seen") {
    await postJSON(`/api/visits/${id}/status`, { action });
    const token = items.find((v) => v.id === id)?.tokenNo ?? "Patient";
    notify(action === "call" ? { title: `Calling ${token}`, description: "Moved to In consultation", tone: "info" } : { title: `${token} seen`, description: "Removed from the queue" });
    if (action === "seen" && selected === id) setSelected(null);
    await mutate();
  }

  async function callNext() {
    const next = waiting[0];
    if (!next) return;
    setCalling(true);
    await act(next.id, "call");
    setSelected(next.id);
    setCalling(false);
  }

  const row = (v: QueueEntry) => (
    <button
      key={v.id}
      onClick={() => setSelected(v.id)}
      className={cn(
        "grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-l-4 px-4 py-3 text-left transition hover:bg-muted/50",
        TRIAGE_META[v.colour as Colour].edge,
        selected === v.id && "bg-accent",
      )}
    >
      <TriageBadge colour={v.colour as Colour} size="sm" className="w-fit" />
      <span className="min-w-0">
        <span className="font-semibold tabular-nums">{v.tokenNo}</span>{" "}
        <span className="text-sm text-muted-foreground">
          {v.age ?? "?"}
          {v.sex === "female" ? "F" : v.sex === "male" ? "M" : ""}
        </span>
        <span className="block truncate text-sm">{v.chiefComplaint}</span>
        {v.provisional && <span className="text-xs text-triage-yellow">Provisional · vitals pending</span>}
        {v.overdue && v.colour === "GREEN" && <span className="text-xs text-muted-foreground">Promoted: long wait</span>}
      </span>
      <span className="text-right text-xs tabular-nums">
        <span className="block">{formatWait(v.waitMinutes)}</span>
        <Sla minutes={v.slaRemaining} colour={v.colour as Colour} />
      </span>
    </button>
  );

  return (
    <div className="grid flex-1 grid-cols-[380px_1fr] overflow-hidden">
      <aside className="flex flex-col overflow-y-auto border-r bg-card">
        <div className="border-b p-3">
          <Button className="h-12 w-full text-base" disabled={!waiting.length || calling} onClick={callNext}>
            {calling ? <Loader2 className="animate-spin" /> : <PhoneCall />}
            Call next {waiting[0] ? `· ${waiting[0].tokenNo}` : ""}
          </Button>
        </div>
        {!data && <Loader2 className="m-6 animate-spin text-muted-foreground" />}
        {inRoom.length > 0 && (
          <>
            <p className="bg-muted/50 px-4 py-1.5 text-xs font-medium uppercase text-muted-foreground">In consultation</p>
            {inRoom.map(row)}
          </>
        )}
        <p className="bg-muted/50 px-4 py-1.5 text-xs font-medium uppercase text-muted-foreground">
          Waiting · {waiting.length} · sorted by severity, then time against SATS target
        </p>
        {data && waiting.length === 0 && <p className="p-6 text-sm text-muted-foreground">Queue is empty.</p>}
        {waiting.map(row)}
      </aside>
      <section className="overflow-y-auto p-6">
        {selected ? (
          <PatientCard
            key={selected}
            visitId={selected}
            onCall={() => act(selected, "call")}
            onSeen={() => {
              setSelected(null);
              void mutate();
            }}
          />
        ) : (
          <div className="mt-24 flex flex-col items-center gap-3 text-center">
            <span className="relative flex size-24 items-center justify-center rounded-full border border-dashed border-primary/30">
              <span className="absolute size-36 rounded-full border border-dashed border-primary/15" />
              <PhoneCall className="size-9 text-primary" />
            </span>
            <p className="font-display text-2xl">Ready for the next patient</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Press “Call next” for the most urgent patient. Their cited history brief opens here before they reach your door.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
