import Link from "next/link";
import {
  ArrowRight,
  Building2,
  ClipboardList,
  FileSearch,
  Gauge,
  MessageCircleQuestion,
  Mic,
  Radar,
  ShieldCheck,
  Stethoscope,
  UserRound,
  WifiOff,
} from "lucide-react";
import hard from "@/eval/hard-results.json";
import leadtime from "@/eval/leadtime.json";
import syndromes from "@/eval/syndrome-results.json";
import liteEval from "@/ml/model/eval.json";
import { LiveDistrict } from "./live-district";

const pct = (x: number) => `${Math.round(x * 100)}%`;

const LAYERS = [
  {
    icon: Mic,
    title: "An AI triage nurse at every front desk",
    text: "Patients speak in Urdu, Roman Urdu or English. Priora understands them, asks the one question that could change their priority, out loud in Urdu, and sends them to the right place. Deterministic SATS rules set the colour; a nurse confirms.",
  },
  {
    icon: Radar,
    title: "Every conversation becomes a disease signal",
    text: "Each intake is tagged with WHO-style syndromes (dengue-like fever, watery diarrhoea, measles-like rash…) and pooled anonymously across hospitals. A daily aberration check flags clusters before lab confirmation.",
  },
  {
    icon: ClipboardList,
    title: "From alert to action plan",
    text: "Health officers get a cited AI brief, the hospitals already seeing cases, a 3-day surge projection and what to stock: beds, test kits, ORS.",
  },
];

const PROOF = (() => [
  { value: `${leadtime.summary.medianLeadDays} days`, label: "earlier outbreak warning than lab-confirmed reporting (median, 1,000 simulated outbreaks)", href: "/impact" },
  { value: `${pct(leadtime.summary.prioraDetectedWithin14)} vs ${pct(leadtime.summary.todayDetectedWithin14)}`, label: "of outbreaks caught within two weeks: Priora vs today", href: "/impact" },
  { value: `${pct(hard.summary.systems.gemini_self_consistency.under_triage ?? 0)}`, label: `missed emergencies on ${hard.summary.n} deliberately hard cases (two-reading safety check)`, href: "/eval" },
  { value: `${hard.summary.voice.voice.n}/${hard.summary.voice.voice.n}`, label: "real Urdu & English voice clips triaged correctly", href: "/eval" },
  { value: `${pct(syndromes.summary.micro_precision)} / ${pct(syndromes.summary.micro_recall)}`, label: "syndrome-tagging precision / recall feeding the network", href: "/eval" },
  { value: `${Math.round(liteEval.latency_ms)} ms`, label: "offline triage with Priora Lite, a model we trained ourselves (no internet needed)", href: "/eval" },
])();

const SCALE = [
  { value: "8,000+", label: "patients a day at PIMS Islamabad, built for 2,000–3,000", src: "Health Ministry reply to the Senate, via The News (2026)", url: "https://www.thenews.pk/print/1421973-the-system-is-unwell" },
  { value: "75%", label: "of expected weekly disease-surveillance reports actually arrive", src: "NIH Pakistan IDSR bulletin, week 44-2025", url: "https://www2.nih.org.pk/wp-content/uploads/2025/11/Weekly_Report-44-2025.pdf" },
  { value: "819 vs 12,000+", label: "dengue cases officially reported in Sindh vs counted by hospitals and labs in six weeks (2025)", src: "Dawn (2025)", url: "https://www.dawn.com/news/amp/1949810" },
  { value: "~1.8 min", label: "average primary-care consultation in Pakistan", src: "Irving et al., BMJ Open 2017", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5695512/" },
];

const ROLES = [
  { href: "/kiosk", icon: UserRound, title: "Talking kiosk", text: "Speak a complaint, hear the follow-up in Urdu" },
  { href: "/surveillance", icon: Radar, title: "District early warning", text: "Map, alerts, AI briefs, surge plans (officer.dho)" },
  { href: "/nurse", icon: Stethoscope, title: "Triage nurse", text: "Blinded assessment, then SATS (nurse.ayesha)" },
  { href: "/doctor", icon: ShieldCheck, title: "Doctor", text: "Severity queue + cited brief (dr.emergency)" },
  { href: "/records", icon: FileSearch, title: "Records desk", text: "Photograph old reports, AI reads them" },
  { href: "/impact", icon: Gauge, title: "Impact & lead time", text: "Days earlier, waits, and every assumption" },
];

export default function Home() {
  return (
    <main className="flex flex-col">
      <section className="bg-gradient-to-b from-primary/10 to-background px-6 pb-10 pt-8">
        <nav className="mx-auto flex max-w-6xl items-center justify-between">
          <span className="text-2xl font-semibold text-brand">Priora</span>
          <span className="flex items-center gap-4 text-sm text-muted-foreground">
            AICON&apos;26 · Build With AI · Health Operations
            <Link href="/login" className="rounded-md border bg-background px-3 py-1.5 text-foreground hover:bg-muted">
              Staff sign in
            </Link>
          </span>
        </nav>
        <div className="mx-auto mt-12 max-w-4xl text-center">
          <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">Priora sees outbreaks a week before the lab reports do.</h1>
          <p className="mx-auto mt-5 max-w-3xl text-xl text-muted-foreground">
            An AI triage nurse at every hospital front desk, speaking Urdu. Every conversation becomes an anonymous signal in a district early-warning
            network across Islamabad and Rawalpindi.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="#live" className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-lg text-primary-foreground hover:bg-primary/85">
              See the live district <ArrowRight className="size-5" />
            </Link>
            <Link href="/kiosk" className="inline-flex h-12 items-center gap-2 rounded-xl border bg-background px-6 text-lg hover:bg-muted">
              Talk to the kiosk
            </Link>
          </div>
        </div>
      </section>

      <section id="live" className="mx-auto w-full max-w-6xl scroll-mt-6 px-6 py-8">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-semibold">Live: the district right now</h2>
            <p className="text-sm text-muted-foreground">
              Four hospitals, twelve areas. Pulsing red = an unusual cluster flagged before lab confirmation. Anonymous counts only (demo data).
            </p>
          </div>
          <Link href="/surveillance" className="text-sm text-primary hover:underline">
            Open the health officer&apos;s view →
          </Link>
        </div>
        <LiveDistrict />
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PROOF.map((p) => (
            <Link key={p.label} href={p.href} className="rounded-xl border bg-card p-4 hover:border-primary">
              <p className="text-3xl font-semibold">{p.value}</p>
              <p className="text-sm text-muted-foreground">{p.label}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-muted/40 px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">How it works · from one patient to the whole district</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {LAYERS.map((l, i) => (
              <div key={l.title} className="flex flex-col rounded-xl border bg-card p-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <l.icon className="size-5" />
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">STEP {i + 1}</span>
                </div>
                <p className="mt-3 text-lg font-semibold">{l.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{l.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <p className="flex items-center gap-2 rounded-lg bg-background p-3">
              <MessageCircleQuestion className="size-4 shrink-0 text-primary" /> Asks one smart follow-up question, aloud in Urdu
            </p>
            <p className="flex items-center gap-2 rounded-lg bg-background p-3">
              <WifiOff className="size-4 shrink-0 text-primary" /> Keeps triaging offline with our own trained model
            </p>
            <p className="flex items-center gap-2 rounded-lg bg-background p-3">
              <Building2 className="size-4 shrink-0 text-primary" /> Pools hospitals that today don&apos;t share data
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-12">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Why it matters</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SCALE.map((s) => (
            <a key={s.value} href={s.url} target="_blank" rel="noreferrer" className="rounded-xl border bg-card p-4 hover:border-primary">
              <p className="text-2xl font-semibold">{s.value}</p>
              <p className="text-sm">{s.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.src} ↗</p>
            </a>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pb-12">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Open the demo · staff password priora2026</h2>
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
        Decision support and early warning only: clinicians confirm every triage; outbreak signals are for investigation, not confirmation. All
        patient and surveillance data in this demo is synthetic. Gemini on Google Cloud Vertex AI · SATS · CDC EARS method.
      </footer>
    </main>
  );
}
