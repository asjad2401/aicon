import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { TriageBadge } from "@/components/triage-badge";
import { DEPARTMENT_BY_ID, type DepartmentId } from "@/lib/routing/departments";
import type { Colour } from "@/lib/triage/discriminators";
import { cn } from "@/lib/utils";
import results from "@/eval/results.json";
import liteEval from "@/ml/model/eval.json";
import liteMetrics from "@/ml/model/metrics.json";

export const metadata: Metadata = { title: "Evaluation · Priora" };

type Row = {
  id: string;
  lang: string;
  age: number;
  text: string;
  expected_colour: Colour;
  expected_department: string;
  got_colour?: Colour;
  triage?: "correct" | "under" | "over";
  got_department?: string;
  dept_top1?: boolean;
  dept_acceptable?: boolean;
  discriminators?: { id: string; evidence: string }[];
  error?: string;
};

const COLOURS: Colour[] = ["RED", "ORANGE", "YELLOW", "GREEN"];
const LANG: Record<string, string> = { english: "English", roman_urdu: "Roman Urdu", urdu: "Urdu" };
const dept = (id?: string) => (id ? (DEPARTMENT_BY_ID[id as DepartmentId]?.name ?? id) : "-");

function Metric({ label, value, note, good = true }: { label: string; value: string; note: string; good?: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn("text-3xl font-semibold", !good && "text-triage-red")}>{value}</p>
      <p className="text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

export default function EvalPage() {
  const s = results.summary;
  const rows = results.results as Row[];
  const done = rows.filter((r) => r.got_colour);
  const cell = (exp: Colour, got: Colour) => done.filter((r) => r.expected_colour === exp && r.got_colour === got).length;
  const langs = [...new Set(rows.map((r) => r.lang))];

  return (
    <main className="flex min-h-screen flex-col bg-muted/30">
      <AppHeader title="Evaluation" />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">How accurate is the AI triage?</h1>
          <p className="mt-1 max-w-3xl text-muted-foreground">
            {s.n} synthetic patient descriptions in {langs.map((l) => LANG[l] ?? l).join(", ")}, each with an expected SATS colour
            and department, run through the real pipeline (AI extraction → deterministic SATS rules → AI routing). Last run{" "}
            {new Date(s.run_at).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Karachi" })}.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Triage colour accuracy" value={`${s.triage_accuracy}%`} note={`${s.completed}/${s.n} cases completed`} />
          <Metric
            label="Under-triage rate"
            value={`${s.under_triage_rate}%`}
            note="Serious case marked less urgent: the error that matters"
            good={s.under_triage_rate === 0}
          />
          <Metric label="Over-triage rate" value={`${s.over_triage_rate}%`} note="Safe direction, costs queue time" />
          <Metric label="Department: exact" value={`${s.dept_top1_accuracy}%`} note={`Acceptable: ${s.dept_acceptable_accuracy}%`} />
          <Metric label="Median latency" value={`${(s.median_ms / 1000).toFixed(1)} s`} note="Extraction + routing" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="rounded-xl border bg-card p-4">
            <p className="mb-3 text-xs font-medium uppercase text-muted-foreground">Confusion matrix · expected × predicted</p>
            <table className="w-full text-center text-sm tabular-nums">
              <thead>
                <tr>
                  <th />
                  {COLOURS.map((c) => (
                    <th key={c} className="pb-2 text-xs font-medium text-muted-foreground">{c.slice(0, 1)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COLOURS.map((exp, i) => (
                  <tr key={exp}>
                    <th className="pr-2 text-left text-xs font-medium text-muted-foreground">{exp}</th>
                    {COLOURS.map((got, j) => {
                      const n = cell(exp, got);
                      return (
                        <td key={got} className="p-0.5">
                          <div
                            className={cn(
                              "rounded-md py-2",
                              i === j && n > 0 && "bg-primary/15 font-semibold text-foreground",
                              j > i && n > 0 && "bg-triage-red/15 font-semibold text-triage-red",
                              j < i && n > 0 && "bg-triage-yellow/15",
                              n === 0 && "text-muted-foreground/40",
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
            <p className="mt-3 text-xs text-muted-foreground">
              Diagonal = correct. Right of the diagonal = under-triage (dangerous). Left = over-triage (safe).
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-3">Patient said</th>
                  <th className="p-3">Expected</th>
                  <th className="p-3">AI + SATS</th>
                  <th className="p-3">Department</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t align-top">
                    <td className="max-w-sm p-3">
                      <p className={cn(r.lang === "urdu" && "font-urdu text-base")} dir={r.lang === "urdu" ? "rtl" : "ltr"}>
                        “{r.text}”
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {LANG[r.lang] ?? r.lang} · age {r.age}
                        {r.discriminators?.length ? ` · signs: ${r.discriminators.map((d) => d.id.replaceAll("_", " ")).join(", ")}` : ""}
                      </p>
                    </td>
                    <td className="p-3"><TriageBadge colour={r.expected_colour} size="sm" /></td>
                    <td className="p-3">
                      {r.got_colour ? (
                        <span className="flex items-center gap-1.5">
                          <TriageBadge colour={r.got_colour} size="sm" />
                          {r.triage !== "correct" && <span className="text-xs font-semibold text-triage-red">{r.triage}</span>}
                        </span>
                      ) : (
                        <span className="text-xs text-destructive">{r.error}</span>
                      )}
                    </td>
                    <td className="p-3 text-xs">
                      <span className={cn(r.dept_acceptable === false && "font-semibold text-triage-red")}>{dept(r.got_department)}</span>
                      {r.dept_top1 === false && <span className="block text-muted-foreground">expected {dept(r.expected_department)}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <section className="flex flex-col gap-4 rounded-xl border bg-card p-5">
          <div>
            <h2 className="text-xl font-semibold">Priora Lite: our own offline model</h2>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              When the internet drops, Priora falls back to a model we trained ourselves: Gemini generated {liteMetrics.items_generated.toLocaleString()} labelled
              complaints in three languages, and we distilled them into a {liteMetrics.features.toLocaleString()}-feature character + word n-gram classifier that
              predicts SATS signs and the department in ~{Math.round(liteEval.latency_ms)} ms on a CPU, with no network. A red-flag phrase lexicon can only add
              urgency; the SATS engine still sets the colour and a nurse confirms. Details: <code className="rounded bg-muted px-1">ml/README.md</code>.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-1">Test set</th><th>Model</th><th>Colour accuracy</th><th>Under-triage</th><th>Department</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="py-2">28 hand-written cases</td><td>Gemini 2.5 Flash (online)</td>
                  <td>{Math.round(liteEval.vignettes.gemini.colour_accuracy * 1000) / 10}%</td>
                  <td>{Math.round(liteEval.vignettes.gemini.under_triage_rate * 1000) / 10}%</td>
                  <td>{Math.round(liteEval.vignettes.gemini.department_acceptable * 1000) / 10}% acceptable</td>
                </tr>
                <tr className="border-t">
                  <td className="py-2">28 hand-written cases</td><td className="font-medium">Priora Lite (offline)</td>
                  <td>{Math.round(liteEval.vignettes.lite.colour_accuracy * 1000) / 10}%</td>
                  <td>{Math.round(liteEval.vignettes.lite.under_triage_rate * 1000) / 10}%</td>
                  <td>{Math.round(liteEval.vignettes.lite.department_acceptable * 1000) / 10}% acceptable</td>
                </tr>
                <tr className="border-t">
                  <td className="py-2">{liteEval.held_out.n} held-out synthetic</td><td className="font-medium">Priora Lite (offline)</td>
                  <td>{Math.round(liteEval.held_out["model+lexicon"].colour_accuracy * 1000) / 10}%</td>
                  <td>{Math.round(liteEval.held_out["model+lexicon"].under_triage_rate * 1000) / 10}%</td>
                  <td>{Math.round(liteEval.held_out.department_accuracy * 1000) / 10}% exact</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            Offline is a safety net, not a replacement: results are provisional and nurse-confirmed. The lexicon was refined after an early miss on one
            hand-written case, so its score there is optimistic; the held-out set is the fairer measure.
          </p>
        </section>

        <p className="text-sm text-muted-foreground">
          Limitations: a small synthetic set written by the team, text input only (voice is tested manually), provisional triage without
          vitals. Reproduce with <code className="rounded bg-muted px-1">npm run eval</code>.
        </p>
      </div>
    </main>
  );
}
