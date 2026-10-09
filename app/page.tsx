import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  FileSearch,
  FileStack,
  Gauge,
  Languages,
  ListOrdered,
  MapPin,
  Mic,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react";
import results from "@/eval/results.json";
import { DEFAULT_PARAMS, simulate } from "@/lib/sim";

const fmtMin = (m: number) => (m < 1 ? "<1 min" : m < 60 ? `${Math.round(m)} min` : `${Math.floor(m / 60)}h ${Math.round(m % 60)}m`);

const PROBLEMS = [
  { icon: MapPin, title: "Wrong door", text: "Patients don't know which OPD to visit, queue in the wrong line, then queue again." },
  { icon: ListOrdered, title: "Flat queues", text: "Chest pain waits behind a skin rash. There is no severity sorting before the queue." },
  { icon: FileStack, title: "A bag of files", text: "Years of paper reports nobody has time to read, so the old ECG and the allergy get missed." },
];

const PIPELINE = [
  { icon: Mic, title: "Speak", ai: "AI #1", text: "Patient describes symptoms by voice or text in Urdu, Roman Urdu or English. AI extracts structured findings, quoting the patient's words." },
  { icon: ShieldCheck, title: "Triage", ai: "SATS rules", text: "South African Triage Scale, deterministic and explainable. AI never sets the colour; the nurse confirms with vitals." },
  { icon: MapPin, title: "Route", ai: "AI #2", text: "Findings (and known history) → the right OPD department. Low confidence falls back to Medical OPD + nurse review." },
  { icon: FileSearch, title: "Read the files", ai: "AI #3", text: "Phone photos of old reports → typed facts with flags and the exact location on the page." },
  { icon: ClipboardList, title: "Brief the doctor", ai: "AI #4", text: "A one-page brief focused on today's complaint. Every line cites its source; uncited claims are removed." },
];

const ROLES = [
  { href: "/kiosk", icon: UserRound, title: "Patient kiosk", text: "Register and describe symptoms" },
  { href: "/nurse", icon: Stethoscope, title: "Triage nurse", text: "Vitals → final SATS colour" },
  { href: "/doctor", icon: ListOrdered, title: "Doctor", text: "Severity queue + cited brief" },
  { href: "/records", icon: FileSearch, title: "Records desk", text: "Digitise old reports" },
  { href: "/impact", icon: Gauge, title: "Impact simulator", text: "Today vs Priora, measured" },
  { href: "/eval", icon: ShieldCheck, title: "Evaluation", text: "Accuracy & under-triage" },
];

export default function Home() {
  const base = simulate(DEFAULT_PARAMS, "baseline");
  const priora = simulate(DEFAULT_PARAMS, "priora");
  const s = results.summary;

  const stats = [
    { value: `${fmtMin(base.byColour.RED.medianWait)} → ${fmtMin(priora.byColour.RED.medianWait)}`, label: "median wait for RED patients", src: "/impact" },
    { value: `${s.under_triage_rate}%`, label: `under-triage on ${s.n} test cases (${s.triage_accuracy}% accurate)`, src: "/eval" },
    { value: `${base.redirects} → ${priora.redirects}`, label: "wrong-line redirects per morning", src: "/impact" },
    { value: `${((base.doctorMinutesOnFiles - priora.doctorMinutesOnFiles) / 60).toFixed(1)} h`, label: "doctor time saved on paper files", src: "/impact" },
  ];

  return (
    <main className="flex flex-col">
      <section className="bg-gradient-to-b from-primary/10 to-background px-6 pb-16 pt-10">
        <nav className="mx-auto flex max-w-6xl items-center justify-between">
          <span className="text-2xl font-semibold text-brand">Priora</span>
          <span className="text-sm text-muted-foreground">AICON&apos;26 · Build With AI · Health Operations</span>
        </nav>
        <div className="mx-auto mt-16 max-w-4xl text-center">
          <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">The right patient, first.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-xl text-muted-foreground">
            AI triage, routing and cited patient history for Pakistan&apos;s government hospital OPDs, before anyone joins a queue.
          </p>
          <p className="mt-2 font-urdu text-xl text-muted-foreground" dir="rtl">صحیح مریض، پہلے</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/kiosk" className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-lg text-primary-foreground hover:bg-primary/85">
              Try the kiosk <ArrowRight className="size-5" />
            </Link>
            <Link href="/impact" className="inline-flex h-12 items-center gap-2 rounded-xl border bg-background px-6 text-lg hover:bg-muted">
              See the impact
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((st) => (
            <Link key={st.label} href={st.src} className="rounded-xl border bg-background p-4 hover:border-primary">
              <p className="text-2xl font-semibold">{st.value}</p>
              <p className="text-sm text-muted-foreground">{st.label}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-14">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">The problem, from inside a government OPD</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {PROBLEMS.map((p) => (
            <div key={p.title} className="rounded-xl border bg-card p-5">
              <p.icon className="size-6 text-triage-orange" />
              <p className="mt-3 text-lg font-semibold">{p.title}</p>
              <p className="mt-1 text-muted-foreground">{p.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Problem identified and solution reviewed with a medical student. SATS is the triage scale in use.
        </p>
      </section>

      <section className="bg-muted/40 px-6 py-14">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">How it works · AI at every step, rules where safety matters</h2>
          <ol className="mt-5 grid gap-4 md:grid-cols-5">
            {PIPELINE.map((step, i) => (
              <li key={step.title} className="flex flex-col rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between">
                  <step.icon className="size-6 text-primary" />
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">{step.ai}</span>
                </div>
                <p className="mt-3 font-semibold">
                  {i + 1}. {step.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{step.text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Languages className="size-4" /> Built for low-literacy, Urdu-first patients · voice input · printed token with health-passport QR
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-14">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Open the demo</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ROLES.map((r) => (
            <Link key={r.href} href={r.href} className="group flex items-center gap-4 rounded-xl border bg-card p-4 transition hover:border-primary hover:shadow-sm">
              <r.icon className="size-8 text-primary" />
              <div className="flex-1">
                <p className="font-semibold">{r.title}</p>
                <p className="text-sm text-muted-foreground">{r.text}</p>
              </div>
              <ArrowRight className="size-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t px-6 py-6 text-center text-xs text-muted-foreground">
        Decision support only: a clinician confirms every triage, and examination follows every brief. All patient data in this demo is synthetic.
        Gemini on Google Cloud Vertex AI · SATS (South African Triage Scale).
      </footer>
    </main>
  );
}
