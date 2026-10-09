"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { postJSON, type VisitDetail } from "@/lib/client/api";
import { DEPARTMENTS, DEPARTMENT_BY_ID, type DepartmentId } from "@/lib/routing/departments";
import { cn } from "@/lib/utils";

type Rx = { drug: string; dose: string; frequency: string; duration: string };
const EMPTY_RX: Rx = { drug: "", dose: "", frequency: "", duration: "" };
const COMMON_LABS = ["CBC", "Blood sugar (random)", "HbA1c", "Lipid profile", "LFTs", "RFTs", "Urine R/E", "ECG", "Chest X-ray", "Troponin", "Dengue NS1", "Malaria parasites"];
const DISPOSITIONS = [
  ["discharged", "Discharged home"],
  ["follow_up", "Follow-up visit"],
  ["referred", "Referred"],
  ["admitted", "Admitted"],
] as const;

const field = "rounded-lg border bg-background px-3 py-2 text-sm";

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cn("rounded-lg border px-3 py-1.5 text-sm", active ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted")}>
      {children}
    </button>
  );
}

/** Read-only view once a consultation has been recorded. */
export function ConsultationSummary({ c }: { c: NonNullable<VisitDetail["consultation"]> }) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="flex items-center gap-2 font-medium text-primary">
        <CheckCircle2 className="size-4" /> Consultation recorded · {new Date(c.createdAt).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Karachi" })}
      </p>
      <p><span className="text-muted-foreground">Diagnosis:</span> {c.diagnoses.join("; ")}</p>
      {c.prescriptions.length > 0 && (
        <ul className="list-disc pl-5">
          {c.prescriptions.map((p, i) => <li key={i}>{[p.drug, p.dose, p.frequency, p.duration].filter(Boolean).join(" · ")}</li>)}
        </ul>
      )}
      {c.labOrders.length > 0 && <p><span className="text-muted-foreground">Labs:</span> {c.labOrders.join(", ")}</p>}
      <p>
        <span className="text-muted-foreground">Outcome:</span> {DISPOSITIONS.find(([d]) => d === c.disposition)?.[1]}
        {c.referredTo && ` → ${DEPARTMENT_BY_ID[c.referredTo as DepartmentId]?.name}`}
        {c.followUpDate && ` on ${c.followUpDate}`}
      </p>
      {c.notes && <p className="whitespace-pre-wrap text-muted-foreground">{c.notes}</p>}
    </div>
  );
}

export function ConsultationForm({ detail, onSaved }: { detail: VisitDetail; onSaved: () => void }) {
  const [notes, setNotes] = useState("");
  const [examination, setExamination] = useState("");
  const [diagnoses, setDiagnoses] = useState<string[]>([""]);
  const [rx, setRx] = useState<Rx[]>([{ ...EMPTY_RX }]);
  const [labs, setLabs] = useState<string[]>([]);
  const [disposition, setDisposition] = useState<(typeof DISPOSITIONS)[number][0]>("discharged");
  const [referredTo, setReferredTo] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [deptCorrect, setDeptCorrect] = useState<boolean | null>(null);
  const [correctDept, setCorrectDept] = useState("");
  const [briefRating, setBriefRating] = useState<"accurate" | "had_error" | "not_used" | null>(detail.facts.length ? null : "not_used");
  const [briefIssue, setBriefIssue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const routedTo = DEPARTMENT_BY_ID[(detail.visit.routing?.specialty ?? detail.visit.department) as DepartmentId];

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await postJSON(`/api/visits/${detail.visit.id}/consult`, {
        notes,
        examination,
        diagnoses,
        prescriptions: rx,
        labOrders: labs,
        disposition,
        ...(disposition === "referred" && referredTo && { referredTo }),
        ...(disposition === "follow_up" && followUpDate && { followUpDate }),
        ...(deptCorrect != null && { departmentCorrect: deptCorrect }),
        ...(deptCorrect === false && correctDept && { correctDepartment: correctDept }),
        ...(briefRating && { briefRating }),
        ...(briefRating === "had_error" && { briefIssue }),
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">History / notes</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={field} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Examination</span>
          <textarea value={examination} onChange={(e) => setExamination(e.target.value)} rows={3} className={field} />
        </label>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground">Diagnosis / working impression</span>
        {diagnoses.map((d, i) => (
          <div key={i} className="flex gap-2">
            <input value={d} onChange={(e) => setDiagnoses(diagnoses.map((x, j) => (j === i ? e.target.value : x)))} className={cn(field, "flex-1")} placeholder="e.g. Acute coronary syndrome (NSTEMI suspected)" />
            {diagnoses.length > 1 && (
              <button type="button" onClick={() => setDiagnoses(diagnoses.filter((_, j) => j !== i))} aria-label="Remove"><X className="size-4 text-muted-foreground" /></button>
            )}
          </div>
        ))}
        <button type="button" onClick={() => setDiagnoses([...diagnoses, ""])} className="flex w-fit items-center gap-1 text-xs text-primary"><Plus className="size-3" /> Add diagnosis</button>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground">Prescription</span>
        {rx.map((r, i) => (
          <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2">
            {(["drug", "dose", "frequency", "duration"] as const).map((k) => (
              <input
                key={k}
                value={r[k]}
                onChange={(e) => setRx(rx.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))}
                placeholder={{ drug: "Drug", dose: "Dose", frequency: "e.g. BD", duration: "e.g. 5 days" }[k]}
                className={field}
              />
            ))}
            <button type="button" onClick={() => setRx(rx.length > 1 ? rx.filter((_, j) => j !== i) : [{ ...EMPTY_RX }])} aria-label="Remove"><X className="size-4 text-muted-foreground" /></button>
          </div>
        ))}
        <button type="button" onClick={() => setRx([...rx, { ...EMPTY_RX }])} className="flex w-fit items-center gap-1 text-xs text-primary"><Plus className="size-3" /> Add medicine</button>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground">Lab orders</span>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_LABS.map((l) => (
            <Choice key={l} active={labs.includes(l)} onClick={() => setLabs(labs.includes(l) ? labs.filter((x) => x !== l) : [...labs, l])}>{l}</Choice>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground">Outcome</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {DISPOSITIONS.map(([d, label]) => (
            <Choice key={d} active={disposition === d} onClick={() => setDisposition(d)}>{label}</Choice>
          ))}
          {disposition === "referred" && (
            <select value={referredTo} onChange={(e) => setReferredTo(e.target.value)} className={field}>
              <option value="">Refer to…</option>
              {DEPARTMENTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
          {disposition === "follow_up" && <input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className={field} />}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-dashed p-3">
        <p className="text-xs font-medium uppercase text-muted-foreground">Clinical validation (helps measure the AI)</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <span>Was <strong>{routedTo?.name}</strong> the right department?</span>
          <Choice active={deptCorrect === true} onClick={() => setDeptCorrect(true)}>Yes</Choice>
          <Choice active={deptCorrect === false} onClick={() => setDeptCorrect(false)}>No</Choice>
          {deptCorrect === false && (
            <select value={correctDept} onChange={(e) => setCorrectDept(e.target.value)} className={field}>
              <option value="">Should have been…</option>
              {DEPARTMENTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
        </div>
        {detail.facts.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span>Pre-consultation brief:</span>
            <Choice active={briefRating === "accurate"} onClick={() => setBriefRating("accurate")}>Accurate</Choice>
            <Choice active={briefRating === "had_error"} onClick={() => setBriefRating("had_error")}>Had an error</Choice>
            <Choice active={briefRating === "not_used"} onClick={() => setBriefRating("not_used")}>Didn&apos;t use it</Choice>
            {briefRating === "had_error" && (
              <input value={briefIssue} onChange={(e) => setBriefIssue(e.target.value)} placeholder="What was wrong?" className={cn(field, "min-w-64 flex-1")} />
            )}
          </div>
        )}
      </div>

      {error && <p className="text-destructive">{error}</p>}
      <Button className="h-12" onClick={save} disabled={saving}>
        {saving ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Save consultation &amp; mark seen
      </Button>
    </div>
  );
}
