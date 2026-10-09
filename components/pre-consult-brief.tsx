"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import type { Brief, BriefSection } from "@/lib/ai/brief";
import type { VisitDetail } from "@/lib/client/api";
import { SourceViewer, type SourceFact } from "./source-viewer";

const SECTIONS: { key: BriefSection; title: string }[] = [
  { key: "relevant_to_today", title: "Relevant to today" },
  { key: "conditions", title: "Known conditions" },
  { key: "medications", title: "Current medications" },
  { key: "allergies", title: "Allergies" },
  { key: "trends", title: "Trends" },
  { key: "gaps", title: "Gaps / pending follow-ups" },
];

const DOC_LABEL: Record<string, string> = {
  lab_report: "Lab report",
  prescription: "Prescription",
  discharge_summary: "Discharge summary",
  ecg_report: "ECG report",
  imaging_report: "Imaging report",
  referral: "Referral",
};

type StoredBrief = Brief & { dropped?: number; factCount?: number };

/**
 * The doctor's cited pre-consultation brief. Every line carries numbered citations;
 * clicking one opens the source scan with the exact region highlighted.
 */
export function PreConsultBrief({ detail, onGenerated }: { detail: VisitDetail; onGenerated: () => void }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<SourceFact | null>(null);
  const requested = useRef(false);

  const stored = detail.summary?.summary as StoredBrief | undefined;
  const stale = detail.facts.length > 0 && stored?.factCount !== detail.facts.length;

  async function generate(force = false) {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/visits/${detail.visit.id}/brief${force ? "?force=1" : ""}`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error);
      onGenerated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate the brief");
    } finally {
      setGenerating(false);
    }
  }

  // Auto-generate once when facts exist and the brief is missing or out of date.
  useEffect(() => {
    if (stale && !requested.current) {
      requested.current = true;
      void generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stale]);

  const factsById = useMemo(() => new Map(detail.facts.map((f) => [f.id, f])), [detail.facts]);
  const docsById = useMemo(() => new Map(detail.documents.map((d) => [d.id, d])), [detail.documents]);

  // Stable citation numbers in order of first appearance.
  const citationNo = useMemo(() => {
    const map = new Map<number, number>();
    if (stored) {
      for (const { key } of SECTIONS)
        for (const item of stored[key] ?? []) for (const id of item.fact_ids) if (!map.has(id)) map.set(id, map.size + 1);
    }
    return map;
  }, [stored]);

  const docLabel = (documentId: number) => {
    const d = docsById.get(documentId);
    return [DOC_LABEL[d?.docType ?? ""] ?? "Document", d?.docDate, d?.facility].filter(Boolean).join(" · ");
  };

  if (detail.facts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No reports on file. The patient can add old reports at the Records desk using their token QR.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {(generating || (stale && !error)) && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> AI is reading {detail.facts.length} facts from {detail.documents.length}{" "}
          report(s) against today&apos;s complaint…
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {stored && (
        <>
          <p className="font-medium">{stored.headline}</p>
          {SECTIONS.map(({ key, title }) =>
            stored[key]?.length ? (
              <div key={key}>
                <p className={key === "relevant_to_today" ? "text-xs font-semibold uppercase text-triage-orange" : "text-xs font-semibold uppercase text-muted-foreground"}>
                  {title}
                </p>
                <ul className="mt-1 flex flex-col gap-1 text-sm">
                  {stored[key].map((item, i) => (
                    <li key={i} className="flex flex-wrap items-baseline gap-x-1">
                      <span>{item.text}</span>
                      {item.fact_ids.map((id) => {
                        const fact = factsById.get(id);
                        if (!fact) return null;
                        return (
                          <button
                            key={id}
                            onClick={() => setOpen(fact as SourceFact)}
                            title={`${fact.label}: ${docLabel(fact.documentId)}`}
                            className="rounded bg-primary/10 px-1 text-[11px] font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
                          >
                            [{citationNo.get(id)}]
                          </button>
                        );
                      })}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null,
          )}
        </>
      )}

      <div className="flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <ShieldCheck className="size-3.5" /> Every line cites its source
          {stored?.dropped ? ` · ${stored.dropped} uncited line(s) removed` : ""} · orientation only, verify at examination
        </span>
        <span className="flex items-center gap-2">
          <FileText className="size-3.5" /> {detail.documents.length} report(s)
          <button onClick={() => generate(true)} disabled={generating} className="hover:text-foreground" aria-label="Regenerate brief">
            <RefreshCw className="size-3.5" />
          </button>
        </span>
      </div>

      {open && <SourceViewer fact={open} documentLabel={docLabel(open.documentId)} onClose={() => setOpen(null)} />}
    </div>
  );
}
