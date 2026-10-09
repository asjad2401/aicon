import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FlaskConical, Loader2 } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { TriageBadge } from "@/components/triage-badge";
import { getSession } from "@/lib/auth/server";
import { DEPARTMENT_BY_ID, type DepartmentId } from "@/lib/routing/departments";
import { ORDER, kappaLabel } from "@/lib/validation/stats";
import { getValidation } from "@/lib/validation/data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Clinical validation · Priora" };

const pct = (x: number | null) => (x == null ? "n/a" : `${Math.round(x * 1000) / 10}%`);
const dept = (id: string | null | undefined) => (id ? (DEPARTMENT_BY_ID[id as DepartmentId]?.name ?? id) : "?");
const fmtMin = (m: number | null) => (m == null ? "n/a" : m < 1 ? "<1 min" : m < 60 ? `${Math.round(m)} min` : `${Math.floor(m / 60)}h ${Math.round(m % 60)}m`);

function Metric({ label, value, note, warn }: { label: string; value: string; note?: string; warn?: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("text-3xl font-semibold", warn && "text-triage-red")}>{value}</p>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

async function Dashboard() {
  const user = await getSession();
  if (!user || !["admin", "officer", "doctor"].includes(user.role)) redirect("/login?next=/validation");
  const v = await getValidation();
  const t = v.triage;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Clinical validation</h1>
        <p className="mt-1 max-w-3xl text-muted-foreground">
          A prospective agreement study built into the daily workflow. Nurses record their own triage colour <strong className="text-foreground">before</strong> the
          system&apos;s SATS result is shown; doctors confirm the department and rate the brief at every consultation.
        </p>
      </div>

      {(t.synthetic > 0 || v.syntheticConsultations > 0) && (
        <p className="flex items-start gap-2 rounded-xl border border-triage-yellow/40 bg-triage-yellow/10 p-3 text-sm">
          <FlaskConical className="mt-0.5 size-4 shrink-0 text-triage-yellow" />
          <span>
            <strong>Demo data:</strong> {t.synthetic} of {t.n} triage records and {v.syntheticConsultations} of {v.consultations} consultations are
            synthetic pilot records seeded for this demo. In a hospital pilot this page fills with real nurse and doctor input. New triages and
            consultations you record are added live.
          </span>
        </p>
      )}

      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Triage: nurse (blinded) vs SATS system</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Paired assessments" value={String(t.n)} />
        <Metric label="Exact agreement" value={pct(t.agreement)} />
        <Metric label="Weighted kappa" value={t.weightedKappa == null ? "n/a" : t.weightedKappa.toFixed(2)} note={`${kappaLabel(t.weightedKappa)} (unweighted κ ${t.kappa?.toFixed(2) ?? "n/a"})`} />
        <Metric label="System less urgent than nurse" value={pct(t.systemUnderTriage)} note="Potential under-triage: reviewed case by case" warn={(t.systemUnderTriage ?? 0) > 0.05} />
        <Metric label="Nurse overrides" value={String(t.overrides)} note="Final colour changed, with reason" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="rounded-xl border bg-card p-4">
          <p className="mb-3 text-xs font-medium uppercase text-muted-foreground">Rows: nurse · columns: system</p>
          <table className="w-full text-center text-sm tabular-nums">
            <thead>
              <tr>
                <th />
                {ORDER.map((c) => <th key={c} className="pb-2 text-xs font-medium text-muted-foreground">{c.slice(0, 1)}</th>)}
              </tr>
            </thead>
            <tbody>
              {ORDER.map((nurse, i) => (
                <tr key={nurse}>
                  <th className="pr-2 text-left text-xs font-medium text-muted-foreground">{nurse}</th>
                  {ORDER.map((system, j) => {
                    const n = t.matrix[i][j];
                    return (
                      <td key={system} className="p-0.5">
                        <div
                          className={cn(
                            "rounded-md py-2",
                            n === 0 && "text-muted-foreground/40",
                            n > 0 && i === j && "bg-primary/15 font-semibold",
                            n > 0 && j > i && "bg-triage-red/15 font-semibold text-triage-red",
                            n > 0 && j < i && "bg-triage-yellow/15",
                          )}
                        >
                          {n}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted-foreground">Right of the diagonal: the system was less urgent than the nurse (the safety-critical cell).</p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-xl border bg-card p-4">
            <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Real waiting times vs SATS targets (seen patients)</p>
            <table className="w-full text-sm tabular-nums">
              <thead className="text-left text-xs text-muted-foreground">
                <tr><th className="pb-1">Colour</th><th>Patients</th><th>Median wait to be called</th><th>Within target</th></tr>
              </thead>
              <tbody>
                {v.timing.map((r) => (
                  <tr key={r.colour} className="border-t">
                    <td className="py-1.5"><TriageBadge colour={r.colour} size="sm" /></td>
                    <td>{r.n}</td>
                    <td>{fmtMin(r.median)}</td>
                    <td>{pct(r.withinTarget)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Metric label="Routing confirmed correct by doctor" value={pct(v.routing.correct)} note={`${v.routing.n} consultations with feedback`} />
            <Metric label="Brief rated accurate" value={pct(v.brief.accurate)} note={`${v.brief.n} briefs rated by doctors`} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Routing errors flagged by doctors</p>
          {v.routing.misroutes.length === 0 ? (
            <p className="text-sm text-muted-foreground">None reported.</p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {v.routing.misroutes.map((m, i) => (
                <li key={i}>
                  “{m.complaint}”: <span className="text-muted-foreground">sent to</span> {dept(m.routedTo)} <span className="text-muted-foreground">→ should be</span> {dept(m.shouldBe)}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Brief errors reported by doctors</p>
          {v.brief.issues.length === 0 ? (
            <p className="text-sm text-muted-foreground">None reported.</p>
          ) : (
            <ul className="list-disc pl-5 text-sm">{v.brief.issues.map((x, i) => <li key={i}>{x}</li>)}</ul>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Method: nurses see the patient&apos;s provisional kiosk colour (needed for queue order) but not the final SATS computation with vitals until they
        record their own colour. Agreement uses Cohen&apos;s kappa with linear weights for the ordered colours; interpretation per Landis &amp; Koch.
        Offline accuracy on fixed test cases is on the <Link href="/eval" className="text-primary hover:underline">evaluation page</Link>.
      </p>
    </div>
  );
}

export default function ValidationPage() {
  return (
    <main className="flex min-h-screen flex-col bg-muted/30">
      <AppHeader title="Clinical validation" />
      <Suspense fallback={<Loader2 className="m-10 animate-spin text-muted-foreground" />}>
        <Dashboard />
      </Suspense>
    </main>
  );
}
