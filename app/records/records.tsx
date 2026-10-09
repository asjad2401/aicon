"use client";

import { useState } from "react";
import useSWR from "swr";
import { Camera, FileImage, Loader2, Search, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetcher } from "@/lib/client/api";
import { compressImage } from "@/lib/client/image";
import type { getPatientRecords } from "@/lib/records";
import { cn } from "@/lib/utils";

type Records = Awaited<ReturnType<typeof getPatientRecords>>;
type RecordsResponse = {
  patient: { id: number; name: string | null; age: number | null; sex: string | null; passportToken: string };
  documents: (Omit<Records["documents"][number], "createdAt"> & { createdAt: string })[];
  facts: Records["facts"];
};

const SAMPLES = [
  "ahmed-2019-discharge",
  "ahmed-2021-ecg",
  "ahmed-2022-hba1c",
  "ahmed-2024-labs",
  "ahmed-2024-prescription",
];

const DOC_LABEL: Record<string, string> = {
  lab_report: "Lab report",
  prescription: "Prescription",
  discharge_summary: "Discharge summary",
  ecg_report: "ECG report",
  imaging_report: "Imaging report",
  referral: "Referral",
  other: "Document",
};

export function FlagBadge({ flag }: { flag: string | null }) {
  if (!flag || flag === "normal") return null;
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
        flag === "high" && "bg-triage-red/15 text-triage-red",
        flag === "low" && "bg-blue-500/15 text-blue-700",
        flag === "abnormal" && "bg-triage-orange/15 text-triage-orange",
      )}
    >
      {flag}
    </span>
  );
}

export function Records({ initialCode }: { initialCode: string }) {
  const [input, setInput] = useState(initialCode);
  const [code, setCode] = useState(initialCode);
  const [pending, setPending] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { data, error: loadError, mutate, isLoading } = useSWR<RecordsResponse>(
    code ? `/api/records?code=${encodeURIComponent(code)}` : null,
    fetcher,
  );

  async function upload(files: { blob: Blob; name: string }[]) {
    setError(null);
    setPending((p) => [...p, ...files.map((f) => f.name)]);
    await Promise.all(
      files.map(async ({ blob, name }) => {
        try {
          const form = new FormData();
          form.append("code", code);
          form.append("file", await compressImage(blob), name.replace(/\.\w+$/, ".jpg"));
          const res = await fetch("/api/records", { method: "POST", body: form });
          if (!res.ok) throw new Error((await res.json()).error);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Upload failed");
        } finally {
          setPending((p) => p.filter((n) => n !== name));
          void mutate();
        }
      }),
    );
  }

  async function uploadSamples() {
    const files = await Promise.all(
      SAMPLES.map(async (s) => ({ blob: await (await fetch(`/samples/${s}.jpg`)).blob(), name: `${s}.jpg` })),
    );
    await upload(files);
  }

  async function removeFact(id: number) {
    await fetch(`/api/facts/${id}`, { method: "DELETE" });
    void mutate();
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setCode(input.trim());
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Token number (e.g. C-001) or health passport code"
          className="h-12 flex-1 rounded-xl border bg-background px-4 text-lg uppercase"
        />
        <Button type="submit" className="h-12 px-6">
          <Search /> Find patient
        </Button>
      </form>

      {isLoading && <Loader2 className="mx-auto animate-spin text-muted-foreground" />}
      {loadError && <p className="text-center text-destructive">{loadError.message}</p>}

      {data && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4">
            <div>
              <p className="text-xl font-semibold">{data.patient.name ?? "Unnamed patient"}</p>
              <p className="text-sm text-muted-foreground">
                {data.patient.age ?? "?"} {data.patient.sex ?? ""} · Passport {data.patient.passportToken} ·{" "}
                {data.documents.length} document(s), {data.facts.length} fact(s)
              </p>
            </div>
            <div className="flex gap-2">
              <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 text-primary-foreground hover:bg-primary/80">
                <Camera className="size-4" /> Photograph / upload reports
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = [...(e.target.files ?? [])].map((f) => ({ blob: f, name: f.name }));
                    e.target.value = "";
                    if (files.length) void upload(files);
                  }}
                />
              </label>
              <Button variant="outline" className="h-11" onClick={uploadSamples} disabled={pending.length > 0}>
                <FileImage /> Use sample documents
              </Button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="grid gap-4 md:grid-cols-2">
            {pending.map((name) => (
              <div key={name} className="flex items-center gap-3 rounded-xl border border-dashed bg-card p-4">
                <Loader2 className="animate-spin text-primary" />
                <div>
                  <p className="font-medium">{name}</p>
                  <p className="text-sm text-muted-foreground">AI is reading this document…</p>
                </div>
              </div>
            ))}

            {data.documents.map((doc) => {
              const facts = data.facts.filter((f) => f.documentId === doc.id);
              return (
                <div key={doc.id} className="flex gap-4 rounded-xl border bg-card p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/documents/${doc.id}/image`}
                    alt=""
                    className="h-40 w-28 shrink-0 rounded-md border object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {DOC_LABEL[doc.docType ?? "other"] ?? "Document"}
                      {doc.docDate && <span className="font-normal text-muted-foreground"> · {doc.docDate}</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{doc.facility}</p>
                    {doc.status === "failed" && (
                      <p className="mt-2 flex items-center gap-1 text-sm text-destructive">
                        <TriangleAlert className="size-4" /> Could not read. Please retake the photo.
                      </p>
                    )}
                    {doc.quality === "poor" && (
                      <p className="mt-1 text-xs text-triage-yellow">Poor photo quality: please verify facts</p>
                    )}
                    <ul className="mt-2 flex flex-col gap-0.5 text-sm">
                      {facts.map((f) => (
                        <li key={f.id} className="group flex items-center gap-1.5">
                          <span className="truncate">
                            {f.label}
                            {f.value && <span className="text-muted-foreground"> {f.value}{f.unit ? ` ${f.unit}` : ""}</span>}
                          </span>
                          <FlagBadge flag={f.flag} />
                          {!f.verified && <span className="text-[10px] text-triage-yellow">unverified</span>}
                          <button
                            onClick={() => removeFact(f.id)}
                            className="ml-auto opacity-0 group-hover:opacity-100"
                            aria-label="Remove fact"
                          >
                            <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
