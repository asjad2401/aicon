"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export type SourceFact = {
  id: number;
  documentId: number;
  label: string;
  value: string | null;
  unit: string | null;
  date: string | null;
  box: [number, number, number, number] | null;
  confidence: number | null;
};

/** Shows the original scanned document with the cited fact's region highlighted. */
export function SourceViewer({
  fact,
  documentLabel,
  onClose,
}: {
  fact: SourceFact;
  documentLabel: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const [ymin, xmin, ymax, xmax] = fact.box ?? [0, 0, 0, 0];
  const pad = 8; // in 0–1000 units, so the highlight doesn't clip the text

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6" onClick={onClose}>
      <div
        className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b p-4">
          <div>
            <p className="font-semibold">
              {fact.label}
              {fact.value && ` · ${fact.value}${fact.unit ? ` ${fact.unit}` : ""}`}
            </p>
            <p className="text-sm text-muted-foreground">
              Source: {documentLabel}
              {fact.confidence != null && ` · read with ${Math.round(fact.confidence * 100)}% confidence`}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 hover:bg-muted">
            <X className="size-5" />
          </button>
        </div>
        <div className="overflow-auto bg-muted p-4">
          <div className="relative mx-auto w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/documents/${fact.documentId}/image`} alt={documentLabel} className="block max-h-[70vh] w-auto" />
            {fact.box && (
              <div
                className="pointer-events-none absolute animate-pulse rounded-sm border-[3px] border-triage-orange bg-triage-orange/15 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]"
                style={{
                  top: `${Math.max(0, ymin - pad) / 10}%`,
                  left: `${Math.max(0, xmin - pad) / 10}%`,
                  height: `${(Math.min(1000, ymax + pad) - Math.max(0, ymin - pad)) / 10}%`,
                  width: `${(Math.min(1000, xmax + pad) - Math.max(0, xmin - pad)) / 10}%`,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
