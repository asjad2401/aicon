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
import { DistrictRadar, LiveTicker } from "@/components/district-radar";
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

const PORTALS = [
  { href: "/kiosk", icon: UserRound, n: "01", title: "Patient kiosk", sub: "kiosk.priora.asjad.dev", text: "At the hospital entrance: speak your problem in Urdu, answer one question, get a token.", cta: "Open the kiosk", tone: "paper-card", ring: "#0b5d52" },
  { href: "/login?portal=hospital", icon: Building2, n: "02", title: "Hospital staff", sub: "hospital.priora.asjad.dev", text: "Triage nurse, doctors, records desk and the medical superintendent's validation dashboard.", cta: "Staff sign in", tone: "bg-primary text-primary-foreground shadow-lg shadow-primary/20", ring: "#f5f1e8" },
  { href: "/login?portal=district", icon: Radar, n: "03", title: "District Health Office", sub: "district.priora.asjad.dev", text: "The early-warning map across all hospitals: alerts, AI briefs, surge plans.", cta: "Officer sign in", tone: "ink-panel shadow-lg shadow-black/20", ring: "#e5482d" },
];

const ROLES = [
  { href: "/kiosk", icon: UserRound, title: "Talking kiosk", text: "Speak a complaint, hear the follow-up in Urdu" },
  { href: "/surveillance", icon: Radar, title: "District early warning", text: "Map, alerts, AI briefs, surge plans (officer.dho)" },
  { href: "/nurse", icon: Stethoscope, title: "Triage nurse", text: "Blinded assessment, then SATS (nurse.ayesha)" },
  { href: "/doctor", icon: ShieldCheck, title: "Doctor", text: "Severity queue + cited brief (dr.emergency)" },
  { href: "/records", icon: FileSearch, title: "Records desk", text: "Photograph old reports, AI reads them" },
  { href: "/impact", icon: Gauge, title: "Impact & lead time", text: "Days earlier, waits, and every assumption" },
];

function Rings({ color, className }: { color: string; className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      {[20, 38, 56].map((r) => (
        <circle key={r} cx="120" cy="0" r={r} fill="none" stroke={color} strokeOpacity="0.35" strokeDasharray="2 4" />
      ))}
      <circle cx="120" cy="0" r="6" fill={color} fillOpacity="0.6" />
    </svg>
  );
}

export default function Home() {
  return (
    <main className="flex flex-col">
      <section className="ink-panel">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 pt-6">
          <span className="flex items-center gap-2 font-display text-3xl font-semibold tracking-tight">
            Priora
            <span className="font-urdu text-lg font-normal text-[#f5f1e8]/60">پرائیورا</span>
          </span>
          <span className="flex items-center gap-4 text-sm text-[#f5f1e8]/60">
            <span className="hidden font-mono text-xs tracking-wider sm:inline">AICON&apos;26 · BUILD WITH AI · HEALTH OPERATIONS</span>
            <Link href="/login" className="rounded-full border border-white/25 px-4 py-1.5 text-[#f5f1e8] hover:bg-white/10">
              Staff sign in
            </Link>
          </span>
        </nav>
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 pb-14 pt-12 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <p className="eyebrow !text-[#7fd3c0]">District early-warning network · Islamabad &amp; Rawalpindi</p>
            <h1 className="mt-5 text-5xl leading-[1.04] sm:text-7xl">
              Priora sees outbreaks <span className="display-italic text-[#ff8a70]">a week</span> before the lab reports do.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-[#f5f1e8]/75">
              An AI triage nurse at every hospital front desk, speaking Urdu. Every conversation becomes an anonymous signal in a district
              early-warning network.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="#live" className="inline-flex h-12 items-center gap-2 rounded-full bg-[#f5f1e8] px-6 text-base font-semibold text-ink hover:bg-white">
                See the live district <ArrowRight className="size-5" />
              </Link>
              <Link href="/kiosk" className="inline-flex h-12 items-center gap-2 rounded-full border border-white/25 px-6 text-base hover:bg-white/10">
                <Mic className="size-4" /> Talk to the kiosk
              </Link>
            </div>
          </div>
          <div className="flex flex-col items-center gap-3">
            <DistrictRadar />
            <p className="font-mono text-[11px] tracking-wider text-[#f5f1e8]/50">● AREA &nbsp; □ HOSPITAL &nbsp; <span className="text-[#ff8a70]">● ACTIVE ALERT</span></p>
          </div>
        </div>
        <LiveTicker />
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pt-12">
        <p className="eyebrow">§ 01 · Three front doors, one network</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {PORTALS.map((p) => (
            <Link key={p.title} href={p.href} className={`group relative flex min-h-56 flex-col gap-2 overflow-hidden rounded-2xl p-6 transition hover:-translate-y-0.5 ${p.tone}`}>
              <Rings color={p.ring} className="absolute right-0 top-0 size-32 transition group-hover:scale-110" />
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs opacity-60">{p.n}</span>
                <p.icon className="size-6" />
              </div>
              <p className="mt-3 font-display text-2xl font-medium">{p.title}</p>
              <p className="text-sm opacity-80">{p.text}</p>
              <div className="mt-auto flex items-end justify-between gap-2 pt-4">
                <span className="inline-flex items-center gap-1 text-sm font-semibold">
                  {p.cta} <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                </span>
                <code className="text-[10px] opacity-55">{p.sub}</code>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section id="live" className="mx-auto w-full max-w-6xl scroll-mt-6 px-6 pt-14">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">§ 02 · Live, the district right now</p>
            <h2 className="mt-2 text-3xl sm:text-4xl">Eight hospitals. Twenty areas. One map.</h2>
            <p className="mt-1 max-w-2xl text-muted-foreground">
              Pulsing red is an unusual cluster flagged before lab confirmation. No single hospital sees enough of it to notice alone. Anonymous counts
              only (demo data).
            </p>
          </div>
          <Link href="/surveillance" className="inline-flex items-center gap-1 rounded-full border bg-card px-4 py-2 text-sm font-medium hover:border-primary">
            Health officer&apos;s view <ArrowRight className="size-4" />
          </Link>
        </div>
        <LiveDistrict />
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pt-16">
        <p className="eyebrow">§ 03 · Proven, not promised</p>
        <div className="mt-4 grid border-t sm:grid-cols-2 lg:grid-cols-3">
          {PROOF.map((p, i) => (
            <Link
              key={p.label}
              href={p.href}
              className={`group border-b p-6 transition hover:bg-card ${i % 3 !== 2 ? "lg:border-r" : ""} ${i % 2 === 0 ? "sm:max-lg:border-r" : ""}`}
            >
              <p className="font-display text-5xl font-medium tracking-tight text-primary">{p.value}</p>
              <p className="mt-2 text-sm text-muted-foreground group-hover:text-foreground">{p.label}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 pt-16">
        <p className="eyebrow">§ 04 · From one patient to the whole district</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {LAYERS.map((l, i) => (
            <div key={l.title} className="paper-card relative flex flex-col p-6">
              <div className="flex items-center justify-between">
                <span className="flex size-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <l.icon className="size-5" />
                </span>
                <span className="font-display text-5xl font-light text-primary/15">0{i + 1}</span>
              </div>
              <p className="mt-4 font-display text-xl font-medium">{l.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">{l.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          {[
            [MessageCircleQuestion, "Asks one smart follow-up question, aloud in Urdu"],
            [WifiOff, "Keeps triaging offline with our own trained model"],
            [Building2, "Pools hospitals that today don't share data"],
          ].map(([Icon, t]) => {
            const I = Icon as typeof Mic;
            return (
              <p key={t as string} className="flex items-center gap-2 rounded-full border bg-card px-4 py-2.5">
                <I className="size-4 shrink-0 text-primary" /> {t as string}
              </p>
            );
          })}
        </div>
      </section>

      <section className="mt-16 bg-ink px-6 py-14 text-[#f5f1e8]">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow !text-[#7fd3c0]">§ 05 · Why it matters</p>
          <div className="mt-6 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {SCALE.map((s) => (
              <a key={s.value} href={s.url} target="_blank" rel="noreferrer" className="group border-l border-white/15 pl-4">
                <p className="font-display text-4xl font-medium text-[#ff8a70]">{s.value}</p>
                <p className="mt-2 text-sm text-[#f5f1e8]/85">{s.label}</p>
                <p className="mt-2 font-mono text-[10px] tracking-wide text-[#f5f1e8]/45 group-hover:text-[#7fd3c0]">{s.src} ↗</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-6 py-14">
        <p className="eyebrow">§ 06 · Open the demo · staff password priora2026</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ROLES.map((r) => (
            <Link key={r.href} href={r.href} className="paper-card group flex items-center gap-4 p-4 transition hover:border-primary">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                <r.icon className="size-5" />
              </span>
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
