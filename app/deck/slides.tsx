"use client";

import type { ReactNode } from "react";
import {
  Activity,
  BedDouble,
  Brain,
  FileText,
  ListOrdered,
  MessageCircleQuestion,
  Mic,
  Network,
  Signpost,
  Siren,
  Tags,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { DistrictRadar } from "@/components/district-radar";
import { cn } from "@/lib/utils";
import hard from "@/eval/hard-results.json";
import leadtime from "@/eval/leadtime.json";
import syndromes from "@/eval/syndrome-results.json";
import lite from "@/ml/model/eval.json";

export type Lens = "doctor" | "tech" | "business";
export const LENSES: { id: Lens; label: string }[] = [
  { id: "doctor", label: "Doctors" },
  { id: "tech", label: "AI experts" },
  { id: "business", label: "Business" },
];

type Ctx = { step: number; lens: Lens };
export type Slide = { id: string; steps?: number; lens?: Lens; render: (c: Ctx) => ReactNode; notes: Partial<Record<Lens | "all", string>> };

const pct = (x: number) => `${Math.round(x * 100)}%`;
const pct1 = (x: number) => `${Math.round(x * 1000) / 10}%`;
const LT = leadtime.summary;
const HS = hard.summary.systems;

/* ---------- building blocks ---------- */
function Reveal({ show, children, className, delay = 0, style }: { show: boolean; children: ReactNode; className?: string; delay?: number; style?: React.CSSProperties }) {
  return (
    <div
      className={cn("transition-all duration-700 ease-out", show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0", className)}
      style={{ ...style, transitionDelay: show ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}
const Eyebrow = ({ children }: { children: ReactNode }) => <p className="font-mono text-[15px] uppercase tracking-[0.18em] text-white/45">{children}</p>;
const Title = ({ children, className }: { children: ReactNode; className?: string }) => (
  <h2 className={cn("mt-4 font-display text-[64px] font-semibold leading-[1.02] tracking-[-0.035em]", className)}>{children}</h2>
);
const Frame = ({ children, className }: { children: ReactNode; className?: string }) => <div className={cn("absolute inset-0 px-[110px] py-[90px]", className)}>{children}</div>;

function Stat({ value, label, src, tone }: { value: string; label: string; src?: string; tone?: "signal" }) {
  return (
    <div className="matte p-7">
      <p className={cn("font-display text-[56px] font-semibold leading-none tracking-tight", tone === "signal" && "text-[#ff6b4a]")}>{value}</p>
      <p className="mt-3 text-[19px] leading-snug text-white/75">{label}</p>
      {src && <p className="mt-3 font-mono text-[11px] text-white/35">{src}</p>}
    </div>
  );
}

/* ---------- 1. Title ---------- */
const title: Slide = {
  id: "title",
  render: () => (
    <Frame className="grid grid-cols-[1.25fr_1fr] items-center gap-12">
      <div>
        <Eyebrow>AICON&apos;26 · Build With AI · Health Operations</Eyebrow>
        <h1 className="mt-6 font-display text-[96px] font-semibold leading-[0.98] tracking-[-0.045em]">Priora sees outbreaks a week before the lab reports do.</h1>
        <p className="mt-8 max-w-[760px] text-[26px] leading-snug text-white/55">
          An AI triage nurse at every hospital front desk, speaking Urdu. Every conversation becomes an anonymous signal in a district early-warning network.
        </p>
        <p className="mt-10 font-mono text-[15px] text-white/40">Asjad Ali · solo build · priora.asjad.dev</p>
      </div>
      <div className="flex justify-center">
        <div className="w-[500px]">
          <DistrictRadar />
        </div>
      </div>
    </Frame>
  ),
  notes: {
    all: "Open with the claim, then prove it. The radar is live: these three red pings are the clusters the system flagged today across Islamabad and Rawalpindi.",
    doctor: "\"I'm Asjad. This started with my sister, a medical student, describing what happens at government OPD front desks. Priora sees outbreaks a week before the lab reports do, and it starts with something you do every day: listening to the patient.\"",
    tech: "\"I'm Asjad, solo build. Gemini on Vertex AI reads every intake, our own offline model takes over when the internet drops, and a deterministic statistics layer turns thousands of conversations into early warnings. I'll show where AI is used and where it deliberately isn't.\"",
    business: "\"I'm Asjad. Pakistan finds outbreaks through lab-confirmed weekly reports, and they arrive weeks late. Priora sees them a week earlier using a tablet already at the front desk. Three teams triage a patient. Priora triages a district.\"",
  },
};

/* ---------- 2. Problem: the timeline ---------- */
const DAYS = 21;
const dx = (d: number) => 60 + (d / DAYS) * 1260;
const problem: Slide = {
  id: "problem",
  steps: 5,
  render: ({ step }) => {
    const events = [
      { d: 0, t: "Day 0", s: "First patients with fever reach the OPDs" },
      { d: 4.2, t: "Day 2–5", s: `About ${pct(leadtime.params.testingRate)} of suspected cases get a lab test` },
      { d: 10, t: "Day 7 + 3", s: "Week closes; the weekly report is compiled 3 days later" },
    ];
    return (
      <Frame>
        <Eyebrow>The problem</Eyebrow>
        <Title>Today, an outbreak is found weeks after it starts.</Title>
        <div className="relative mt-16 h-[260px]">
          <div className="absolute left-[60px] right-[60px] top-[120px] h-[2px] bg-white/15" />
          <div
            className="absolute top-[110px] h-[22px] rounded-full bg-[#e5482d]/25 transition-all duration-1000"
            style={{ left: dx(0), width: step >= 4 ? dx(LT.todayMedianDay) - dx(0) : 0 }}
          />
          {events.map((e, i) => (
            <Reveal key={e.t} show={step >= i} className="absolute top-0 w-[240px]" style={{ left: dx(e.d) - 9 }} delay={100}>
              <p className="font-mono text-[16px] text-white/50">{e.t}</p>
              <p className="mt-1 text-[20px] leading-snug">{e.s}</p>
            </Reveal>
          ))}
          {events.map((e, i) => (
            <span key={`dot-${e.t}`} className={cn("absolute top-[112px] size-[18px] rounded-full border-2 border-white bg-[#0b0b0b] transition-opacity duration-500", step >= i ? "opacity-100" : "opacity-0")} style={{ left: dx(e.d) - 9 }} />
          ))}
          <Reveal show={step >= 4} className="absolute top-0 w-[260px]" style={{ left: dx(LT.todayMedianDay) - 11 }}>
            <p className="font-mono text-[16px] text-[#ff6b4a]">Day {LT.todayMedianDay}</p>
            <p className="mt-1 text-[20px] leading-snug">The district notices (median, simulated)</p>
          </Reveal>
          <span className={cn("absolute top-[110px] size-[22px] rounded-full bg-[#e5482d] transition-opacity duration-500", step >= 4 ? "opacity-100" : "opacity-0")} style={{ left: dx(LT.todayMedianDay) - 11 }} />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-6">
          <Reveal show={step >= 3}>
            <Stat value="Only 75%" label="of expected weekly IDSR surveillance reports arrive; Punjab marked 'not reported' that week" src="NIH Pakistan IDSR bulletin, week 44-2025" tone="signal" />
          </Reveal>
          <Reveal show={step >= 4} delay={300}>
            <Stat value="819 vs 12,000+" label="Sindh 2025: dengue cases officially reported vs counted by hospitals and labs in six weeks" src="Dawn, 19 Oct 2025" tone="signal" />
          </Reveal>
        </div>
      </Frame>
    );
  },
  notes: {
    all: "Click through the timeline: first patients, lab tests, weekly report lag, missing reports, and the district noticing around day 17. The red bar is silent spread.",
    doctor: "\"You see the first dengue patients on day zero. But the system only counts a lab-confirmed case, only about a third get tested, the weekly report is compiled days later, and a quarter of reports never arrive. By the time the district reacts, your wards are already full.\"",
    tech: "\"This is the baseline we model: 30% testing, 1–3 day lab turnaround, weekly reporting with a 3-day lag, 75% compliance, the one figure we could source from NIH. In simulation that puts median detection around day 17.\"",
    business: "\"The cost of slow surveillance is real: in Sindh last year the official count was 819 dengue cases while hospitals and labs saw over twelve thousand. Decisions on beds, kits and fogging are made on the wrong number, weeks late.\"",
  },
};

/* ---------- 3. Insight ---------- */
const insight: Slide = {
  id: "insight",
  steps: 3,
  render: ({ step }) => (
    <Frame>
      <Eyebrow>The insight</Eyebrow>
      <Title>The first signal is already spoken at the front desk.</Title>
      <div className="mt-14 grid grid-cols-[1fr_1.1fr] gap-14">
        <Reveal show={step >= 0} className="flex flex-col gap-5">
          <Stat value="8,000+" label="patients a day at PIMS Islamabad, built for 2,000–3,000" src="Health Ministry reply to the Senate, via The News, 2026" />
          <Stat value="1.8 min" label="average primary-care consultation in Pakistan" src="Irving et al., BMJ Open 2017" />
        </Reveal>
        <div className="flex flex-col gap-6">
          <Reveal show={step >= 1}>
            <div className="matte p-8">
              <p className="font-urdu text-[34px] leading-[2]" dir="rtl">تین دن سے تیز بخار ہے، جسم میں شدید درد ہے</p>
              <p className="mt-2 text-[22px] text-white/60">&ldquo;High fever for three days, severe body aches.&rdquo;</p>
              <p className="mt-6 text-[20px] text-white/80">
                That sentence is a <span className="text-[#ff6b4a]">dengue-like signal on day one</span>. Today it&apos;s written on a paper slip and lost. Records in
                Rawalpindi/ICT hospitals are still mostly manual.
              </p>
              <p className="mt-3 font-mono text-[11px] text-white/35">PLoS One 2021: health information systems &ldquo;completely absent&rdquo; at all levels</p>
            </div>
          </Reveal>
          <Reveal show={step >= 2}>
            <p className="font-display text-[40px] font-semibold leading-tight">Priora listens at every front desk, and pools what it hears across the district.</p>
          </Reveal>
        </div>
      </div>
    </Frame>
  ),
  notes: {
    all: "The patient tells the front desk their symptoms days before any lab result. Priora captures that signal.",
    doctor: "\"Your OPD is overwhelmed: eight thousand a day at PIMS, under two minutes per consultation. But the patient tells you the most important thing at the door. We don't add work. We capture what is already said.\"",
    tech: "\"Syndromic surveillance is an established public-health method. What was missing is the data capture: unstructured Urdu speech at a crowded desk. That's exactly what LLMs are now good at.\"",
    business: "\"The insight: the data is generated for free at every front desk, every day. Nobody captures it. Priora is the capture layer, and the triage benefit pays for its place at the desk.\"",
  },
};

/* ---------- 4. Pipeline (centrepiece) ---------- */
type Kind = "AI" | "RULES" | "PEOPLE";
type Node = { label: string; sub: string; icon: LucideIcon; kind: Kind; x: number; y: number; text: Record<Lens, string> };
const TOP = 265;
const BOT = 535;
const TX = (i: number) => 230 + i * 210;
const BX = (i: number) => 440 + i * 260;
const NODES: Node[] = [
  { label: "Speak", sub: "Urdu voice at the kiosk", icon: Mic, kind: "PEOPLE", x: TX(0), y: TOP, text: {
    doctor: "The patient speaks in Urdu, Roman Urdu or English. No forms, no reading: 1 in 3 adults can't read, 44% of rural women.",
    tech: "Browser audio is sent straight to Gemini 2.5 Flash, which handles speech and extraction in one multimodal call. 30/30 real voice clips triaged correctly.",
    business: "No new hardware: a tablet at the existing desk. Voice-first means it works for every patient, not just literate ones." } },
  { label: "Understand", sub: "Gemini, two readings", icon: Brain, kind: "AI", x: TX(1), y: TOP, text: {
    doctor: "AI extracts symptoms, duration and danger signs, quoting the patient's own words as evidence. It reads twice; if the readings disagree, the more urgent one wins and the nurse is told.",
    tech: "Structured output (JSON schema from Zod, validated, retried on a fallback model). Two parallel extractions at different temperatures = self-consistency: under-triage 0.9% → 0% on 110 hard cases.",
    business: "This is the step everyone thinks is the product. For us it's the input to two products: safer queues today, district intelligence tomorrow." } },
  { label: "Ask", sub: "one follow-up, aloud", icon: MessageCircleQuestion, kind: "AI", x: TX(2), y: TOP, text: {
    doctor: "If one answer could change the priority (pregnancy, chest pain spreading, blood in vomit), it asks that single question aloud in Urdu. Never more than one.",
    tech: "A Flash-Lite planner picks from a fixed bank of 45 pre-recorded Urdu questions, so speech is instant and every question is clinician-reviewable. It only asks if the answer can change the SATS colour.",
    business: "A talking kiosk feels like a nurse, not a form. That's what makes patients actually use it, and coverage is what powers the network." } },
  { label: "Prioritise", sub: "SATS rules, not AI", icon: ListOrdered, kind: "RULES", x: TX(3), y: TOP, text: {
    doctor: "The colour comes from the South African Triage Scale, the scale your hospitals already use: TEWS from vitals plus discriminators. The AI never decides severity.",
    tech: "Deterministic TEWS + discriminator rules in TypeScript, unit-tested. The LLM only maps language to discriminator IDs. Severity is auditable line by line.",
    business: "Using a scale hospitals already trust removes the biggest adoption blocker: nobody has to trust a black box with a patient's priority." } },
  { label: "Route", sub: "right department", icon: Signpost, kind: "AI", x: TX(4), y: TOP, text: {
    doctor: "Sends the patient to the right door (cardiology, gynae, paeds…), using their history on file. In simulation, wrong-line redirects fall from 48 to 10 per morning.",
    tech: "Flash-Lite with history context; acceptable department on 98.2% of hard cases. Doctors confirm or correct routing at every consultation, which feeds validation.",
    business: "Fewer wrong queues means fewer wasted doctor minutes and fewer angry patients: an operational win the medical superintendent feels on day one." } },
  { label: "Confirm", sub: "nurse, blinded", icon: UserCheck, kind: "PEOPLE", x: TX(5), y: TOP, text: {
    doctor: "The nurse records her own colour before seeing the system's, then confirms or overrides with a reason. That blinded pair is a built-in agreement study.",
    tech: "Blinded paired ratings → weighted Cohen's kappa, live on the validation dashboard. Every override is logged with a reason: labelled data for the next model.",
    business: "Human-in-the-loop by design: clinicians stay accountable, and every day of use generates validation evidence for regulators and buyers." } },
  { label: "Brief", sub: "cited history", icon: FileText, kind: "AI", x: TX(6), y: TOP, text: {
    doctor: "Old paper reports are photographed once. The doctor gets a one-page brief where every line links to the original report. A line without a real source is dropped.",
    tech: "Gemini reads documents with bounding boxes; the brief must cite fact IDs, and citations that don't match a real fact are removed before display. Hallucination is filtered structurally.",
    business: "Doctors save hours on paper files (simulated 5.7 h → 1.9 h per morning). That's the benefit hospitals feel; the district benefit comes for free." } },
  { label: "Tag", sub: "WHO-style syndromes", icon: Tags, kind: "AI", x: BX(0), y: BOT, text: {
    doctor: "The same intake is tagged with syndromes: dengue-like fever, acute watery diarrhoea, measles-like rash… Only the tag and the area leave the hospital, never the patient.",
    tech: `Tagged in the same extraction call. Evaluated on 44 cases: precision ${pct1(syndromes.summary.micro_precision)}, recall ${pct1(syndromes.summary.micro_recall)}, 16/16 negatives clean.`,
    business: "The second product is a by-product: zero extra work for staff, zero extra cost per patient." } },
  { label: "Pool", sub: "8 hospitals, anonymous", icon: Network, kind: "RULES", x: BX(1), y: BOT, text: {
    doctor: "Counts are pooled across hospitals that today don't share data. In our demo no single hospital saw more than 27% of any cluster, so none would notice alone.",
    tech: "Anonymous daily counts per area × syndrome. The public API strips everything but aggregates; the district view never sees identities.",
    business: "Network effect: each hospital that joins makes every alert faster for all the others. That's the moat." } },
  { label: "Detect", sub: "CDC EARS method", icon: Activity, kind: "RULES", x: BX(2), y: BOT, text: {
    doctor: "A standard statistical check (CDC EARS) compares today with the last 7 days. Unusual clusters are flagged for investigation, never declared as outbreaks.",
    tech: "EARS C2: 7-day baseline, 2-day guard band, alert at score ≥ 3 with ≥ 3 cases. Deterministic and explainable; the LLM doesn't decide what's an outbreak.",
    business: "A public-health-standard method means health officials can defend the alert. Explainable beats clever." } },
  { label: "Alert", sub: "AI brief for the officer", icon: Siren, kind: "AI", x: BX(3), y: BOT, text: {
    doctor: "The health officer gets a cited brief: which hospitals are seeing cases, the trend, and actions drawn only from a standard response checklist.",
    tech: "Gemini writes the brief from 11 computed statistics it must cite (s1–s11); actions come from a fixed checklist, so it can't invent interventions.",
    business: "The DHO goes from 'we heard rumours' to an evidence-backed action list, days earlier." } },
  { label: "Plan", sub: "3-day surge projection", icon: BedDouble, kind: "RULES", x: BX(4), y: BOT, text: {
    doctor: "A 3-day projection says what to prepare: beds (using the 13.3% dengue admission rate from Rawalpindi's teaching hospitals, 2025), NS1 kits, ORS.",
    tech: "Log-linear growth fit anchored on today's count, capped at doubling every 2 days, with ranges. Simple on purpose.",
    business: "This is where money is saved: beds and kits in place before the surge, not after." } },
];
const KIND_STYLE: Record<Kind, string> = { AI: "bg-white text-black", RULES: "border border-white/60 text-white", PEOPLE: "border border-dashed border-white/50 text-white/80" };

function Pipeline({ step, lens }: Ctx) {
  const active = step - 1; // step 0 = overview
  const cur = NODES[active];
  const lit = (i: number) => active >= i;
  const line = (a: Node, b: Node, on: boolean, key: string) => (
    <line key={key} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={on ? "#ededed" : "#2e2e2e"} strokeWidth={on ? 3 : 2} strokeDasharray={on ? "0" : "6 6"} style={{ transition: "stroke 0.6s" }} />
  );
  return (
    <Frame className="py-[70px]">
      <div className="flex items-center justify-between">
        <Eyebrow>The pipeline</Eyebrow>
        <div className="flex gap-3 font-mono text-[13px]">
          <span className={cn("rounded-full px-3 py-1", KIND_STYLE.AI)}>AI reads &amp; writes</span>
          <span className={cn("rounded-full px-3 py-1", KIND_STYLE.RULES)}>Rules decide</span>
          <span className={cn("rounded-full px-3 py-1", KIND_STYLE.PEOPLE)}>People confirm</span>
        </div>
      </div>
      <Title className="whitespace-nowrap text-[50px]">From one patient to the whole district.</Title>
      <div className="absolute inset-x-0 top-0 h-full">
        <p className="absolute left-[70px] w-[200px] -translate-x-1/2 -rotate-90 text-center font-mono text-[12px] uppercase tracking-[0.18em] text-white/40" style={{ top: TOP - 8 }}>One patient</p>
        <p className="absolute left-[70px] w-[200px] -translate-x-1/2 -rotate-90 text-center font-mono text-[12px] uppercase tracking-[0.18em] text-[#ff6b4a]/70" style={{ top: BOT - 8 }}>Whole district</p>
        <svg className="absolute inset-0" width={1600} height={900}>
          {NODES.slice(0, 6).map((n, i) => line(n, NODES[i + 1], lit(i + 1), `t${i}`))}
          {line(NODES[1], NODES[7], lit(7), "down")}
          {NODES.slice(7, 11).map((n, i) => line(n, NODES[i + 8], lit(i + 8), `b${i}`))}
        </svg>
        {NODES.map((n, i) => {
          const Icon = n.icon;
          const on = lit(i);
          return (
            <div
              key={n.label}
              className={cn("absolute flex w-[180px] -translate-x-1/2 -translate-y-[44px] flex-col items-center text-center transition-all duration-500", on ? "opacity-100" : "opacity-35", active === i && "scale-110")}
              style={{ left: n.x, top: n.y }}
            >
              <span
                className={cn(
                  "flex size-[88px] items-center justify-center rounded-2xl border transition-all duration-500",
                  active === i ? "border-white bg-white text-black shadow-[0_0_40px_rgba(255,255,255,0.25)]" : on ? "border-white/40 bg-[#1f1f1f]" : "border-[#2e2e2e] bg-[#141414]",
                )}
              >
                <Icon className="size-9" />
              </span>
              <span className="mt-3 text-[20px] font-semibold">{n.label}</span>
              <span className="text-[14px] text-white/50">{n.sub}</span>
              <span className={cn("mt-2 rounded-full px-2 py-0.5 font-mono text-[10px]", KIND_STYLE[n.kind])}>{n.kind}</span>
            </div>
          );
        })}
        {/* the travelling signal */}
        <span
          className="absolute size-[16px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e5482d] shadow-[0_0_24px_8px_rgba(229,72,45,0.55)] transition-all duration-700 ease-in-out"
          style={{ left: cur ? cur.x + 52 : 60, top: cur ? cur.y - 52 : TOP - 52, opacity: cur ? 1 : 0 }}
        />
      </div>
      <div className="absolute inset-x-[110px] bottom-[50px]">
        <div key={`${active}-${lens}`} className="matte animate-in fade-in slide-in-from-bottom-2 flex gap-6 p-7 duration-500">
          {cur ? (
            <>
              <span className="font-display text-[44px] font-semibold leading-none text-white/25">{String(active + 1).padStart(2, "0")}</span>
              <div>
                <p className="text-[24px] font-semibold">
                  {cur.label} <span className="font-normal text-white/50">· {cur.sub}</span>
                </p>
                <p className="mt-2 text-[21px] leading-snug text-white/80">{cur.text[lens]}</p>
              </div>
            </>
          ) : (
            <p className="text-[24px] leading-snug text-white/80">
              Twelve steps. <strong className="text-white">AI in six</strong> (reading and writing), <strong className="text-white">rules in four</strong> (every decision
              about severity and outbreaks), <strong className="text-white">people in two</strong>. Press → to follow one patient&apos;s words all the way to a district
              alert.
            </p>
          )}
        </div>
      </div>
    </Frame>
  );
}
const pipeline: Slide = {
  id: "pipeline",
  steps: NODES.length + 1,
  render: (c) => <Pipeline {...c} />,
  notes: {
    all: "Walk node by node; the red dot is the patient's words travelling. The bottom panel text changes with the judge lens, so read it or paraphrase it. Key line: AI reads and writes, rules decide, people confirm.",
    doctor: "Emphasise: severity is SATS, not AI. The nurse is blinded. Every brief line is cited. Only an anonymous syndrome tag + area leaves the hospital.",
    tech: "Emphasise: structured outputs with validation, self-consistency for safety, fixed question bank for the voice, citation filtering, deterministic EARS. The LLM never makes a decision that can't be audited.",
    business: "Emphasise: one install gives two products, safer queues for the hospital (the reason it gets deployed) and district intelligence (the reason it scales). Each new hospital improves every alert.",
  },
};

/* ---------- 5. Live demo ---------- */
const demo: Slide = {
  id: "demo",
  render: () => (
    <Frame className="flex flex-col justify-center">
      <Eyebrow>Live demo</Eyebrow>
      <Title className="text-[88px]">Meet Ahmed, 54.</Title>
      <p className="mt-4 text-[28px] text-white/55">Chest pain, at the PIMS kiosk. Then: the whole district.</p>
      <div className="mt-14 grid grid-cols-4 gap-5">
        {[
          ["kiosk.priora.asjad.dev", "Speaks in Urdu, answers one question"],
          ["hospital.priora.asjad.dev", "Nurse: blinded colour, SATS says RED"],
          ["hospital.priora.asjad.dev", "Doctor: cited brief from 5 old reports"],
          ["district.priora.asjad.dev", "Officer: 3 live alerts, surge plan"],
        ].map(([u, t], i) => (
          <div key={i} className="matte p-6">
            <p className="font-display text-[40px] font-semibold text-white/25">0{i + 1}</p>
            <p className="mt-2 text-[21px] leading-snug">{t}</p>
            <p className="mt-4 font-mono text-[13px] text-white/45">{u}</p>
          </div>
        ))}
      </div>
    </Frame>
  ),
  notes: {
    all: "Switch to the browser tabs (kiosk, nurse, doctor, district). Code AHMED54K7Q. Say: 'Seenay mein dard hai, baayen baazu tak ja raha hai, paseena aa raha hai.' Nurse vitals HR 130, RR 30, BP 95, Temp 37 → RED. Doctor: click a citation. District: G-9 dengue alert → brief → surge plan. If anything fails, the next slides carry the story.",
  },
};

/* ---------- 6. Evidence: lead time ---------- */
const HIST = leadtime.summary.leadHistogram.filter((h) => h.days >= -14 && h.days <= 28);
const HMAX = Math.max(...HIST.map((h) => h.count));
const evidence: Slide = {
  id: "evidence",
  steps: 3,
  render: ({ step }) => (
    <Frame>
      <Eyebrow>Proof · lead-time study</Eyebrow>
      <Title>{LT.scenarios.toLocaleString()} simulated outbreaks. Priora warns a median {LT.medianLeadDays} days earlier.</Title>
      <div className="mt-12 grid grid-cols-[1.5fr_1fr] gap-12">
        <div>
          <div className="flex h-[330px] items-end gap-[5px]">
            {HIST.map((h, i) => (
              <div
                key={h.days}
                title={`${h.days} days: ${h.count}`}
                className="flex-1 rounded-t-[4px] transition-all duration-700 ease-out"
                style={{ height: `${(h.count / HMAX) * 100}%`, background: h.days > 0 ? "#ededed" : "#4a4a4a", transform: `scaleY(${step >= 0 ? 1 : 0})`, transformOrigin: "bottom", transitionDelay: `${i * 18}ms` }}
              />
            ))}
          </div>
          <div className="mt-3 flex justify-between font-mono text-[13px] text-white/45">
            <span>← lab reports first</span>
            <span>days Priora alerted earlier →</span>
          </div>
        </div>
        <div className="flex flex-col gap-5">
          <Reveal show={step >= 1}>
            <Stat value={`${pct(LT.prioraDetectedWithin14)} vs ${pct(LT.todayDetectedWithin14)}`} label="of outbreaks caught within two weeks: Priora vs lab-confirmed reporting" />
          </Reveal>
          <Reveal show={step >= 1} delay={150}>
            <Stat value={`${LT.leadIqr[0]}–${LT.leadIqr[1]} days`} label="middle half of the lead time; about one false alarm every two months across 20 areas" />
          </Reveal>
        </div>
      </div>
      <Reveal show={step >= 2} className="mt-8">
        <p className="text-[21px] text-white/70">
          <span className="text-[#ff6b4a]">Honest limit:</span> below roughly 40% of patients passing a Priora kiosk, the advantage disappears. Only the 75% report compliance is
          sourced; testing, lab delay and growth rates are stated, adjustable assumptions (try them at /impact).
        </p>
      </Reveal>
    </Frame>
  ),
  notes: {
    all: "Gray bars = outbreaks where lab reporting was first; white = Priora first. Then the two numbers, then the honest limit.",
    doctor: "\"This is a simulation, not a trial, and I'll be precise about that. With 60% kiosk coverage and the syndrome accuracy we measured, Priora flags a median seven days earlier. The real test is a pilot, which is what we're asking for.\"",
    tech: "\"Monte Carlo, 1,000 scenarios, 20 areas, background noise, outbreaks doubling every 3–7 days. Priora's arm runs the exact EARS rule the live system runs; sensitivity is the measured 87% recall. The coverage sweep: 20% → -1 day, 40% → 4, 60% → 7, 80% → 9.\"",
    business: "\"A week earlier is the difference between pre-positioning beds and kits and buying them in a panic. And we're upfront about where it doesn't work: it needs coverage, so we start with the biggest OPDs.\"",
  },
};

/* ---------- 7. Trust ---------- */
const trust: Slide = {
  id: "trust",
  steps: 4,
  render: ({ step }) => (
    <Frame>
      <Eyebrow>Built to be trusted</Eyebrow>
      <Title>AI reads. Rules decide. People confirm.</Title>
      <div className="mt-12 grid grid-cols-3 gap-6">
        {[
          ["AI reads", "Extracts symptoms quoting the patient's words. Reads twice; the more urgent reading wins. Brief lines without a real citation are dropped."],
          ["Rules decide", "Severity: South African Triage Scale (TEWS + discriminators). Outbreaks: CDC EARS statistics. Both deterministic and auditable."],
          ["People confirm", "Nurse records a blinded colour, then confirms or overrides with a reason. Doctor confirms routing and rates every brief."],
        ].map(([h, t], i) => (
          <Reveal key={h} show={step >= i} delay={100}>
            <div className="matte h-full p-8">
              <p className="font-display text-[34px] font-semibold">{h}</p>
              <p className="mt-4 text-[20px] leading-snug text-white/70">{t}</p>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal show={step >= 3} className="mt-8 grid grid-cols-3 gap-6">
        <Stat value={pct(HS.gemini_self_consistency.under_triage)} label={`missed emergencies on ${hard.summary.n} deliberately hard cases (two-reading check)`} tone="signal" />
        <Stat value={`${hard.summary.voice.voice.n}/${hard.summary.voice.voice.n}`} label="real Urdu and English voice clips triaged correctly" />
        <Stat value={`${Math.round(lite.latency_ms)} ms`} label="offline triage with Priora Lite, our own model, when the internet drops" />
      </Reveal>
    </Frame>
  ),
  notes: {
    all: "Three columns, then the three numbers.",
    doctor: "\"The question I'd ask as a doctor: what if the AI is wrong? It never decides severity; SATS does. It reads twice and keeps the more urgent reading. The nurse decides blind first. On 110 cases written to trick it (hidden red flags, negations, code-switching), zero missed emergencies.\"",
    tech: "\"Safety is architectural, not prompt-level: self-consistency at two temperatures, validated JSON schemas, citation filtering, deterministic decision layers, and an offline n-gram model with a red-flag lexicon as a fallback.\"",
    business: "\"Hospitals buy trust, not AI. Every decision maps to a standard they already defend (SATS, CDC EARS), and every interaction produces audit evidence.\"",
  },
};

/* ---------- lens slides ---------- */
function Bars({ rows, step }: { rows: { label: string; before: number; after: number; fmt: (n: number) => string; better: "lower" | "higher" }[]; step: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-16 gap-y-10">
      {rows.map((r, i) => {
        const max = Math.max(r.before, r.after);
        return (
          <Reveal key={r.label} show={step >= 1 + Math.floor(i / 2)}>
            <p className="text-[21px] font-semibold">{r.label}</p>
            <div className="mt-2 flex items-center gap-4">
              <span className="w-[90px] font-mono text-[13px] text-white/45">Today</span>
              <div className="h-[20px] flex-1 rounded-full bg-white/5"><div className="h-full rounded-full bg-[#4a4a4a] transition-all duration-1000" style={{ width: `${(r.before / max) * 100}%` }} /></div>
              <span className="w-[110px] text-right text-[19px] tabular-nums text-white/60">{r.fmt(r.before)}</span>
            </div>
            <div className="mt-2 flex items-center gap-4">
              <span className="w-[90px] font-mono text-[13px] text-white">Priora</span>
              <div className="h-[20px] flex-1 rounded-full bg-white/5"><div className="h-full rounded-full bg-[#ededed] transition-all duration-1000" style={{ width: `${Math.max(1.5, (r.after / max) * 100)}%` }} /></div>
              <span className="w-[110px] text-right text-[19px] font-semibold tabular-nums">{r.fmt(r.after)}</span>
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}
const hm = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`);

const doctorImpact: Slide = {
  id: "doctor-impact",
  lens: "doctor",
  steps: 3,
  render: ({ step }) => (
    <Frame>
      <Eyebrow>For clinicians · one OPD morning, simulated</Eyebrow>
      <Title>The sickest patient is seen first, in the right room.</Title>
      <p className="mt-3 text-[20px] text-white/50">Same 300 synthetic patients, 4 doctors, 4 hours: today&apos;s single first-come line vs Priora. Only the process changes.</p>
      <div className="mt-12">
        <Bars
          step={step}
          rows={[
            { label: "RED patients: median wait to be seen", before: 65, after: 1, fmt: hm, better: "lower" },
            { label: "ORANGE seen within the 10-minute target", before: 14, after: 100, fmt: (n) => `${n}%`, better: "higher" },
            { label: "Wrong-line redirects per morning", before: 48, after: 10, fmt: (n) => String(n), better: "lower" },
            { label: "Doctor time on paper files", before: 5.7, after: 1.9, fmt: (n) => `${n} h`, better: "lower" },
          ]}
        />
      </div>
      <Reveal show={step >= 2} delay={400} className="mt-12">
        <p className="text-[20px] text-white/60">
          <span className="text-white">The trade-off:</span> GREEN patients wait a little longer, still within their target. Every assumption is adjustable live at
          priora.asjad.dev/impact.
        </p>
      </Reveal>
    </Frame>
  ),
  notes: {
    doctor: "\"Here's what changes in your OPD. A RED patient waits about a minute instead of over an hour. Very urgent patients hit the 10-minute target. Fewer patients are sent to the wrong line. And with cited briefs, about four doctor-hours a morning come back from paper files. The trade-off: green patients wait a little longer, still within target.\"",
  },
};

const doctorSafety: Slide = {
  id: "doctor-safety",
  lens: "doctor",
  steps: 3,
  render: ({ step }) => (
    <Frame>
      <Eyebrow>For clinicians · validation is part of the workflow</Eyebrow>
      <Title>A safety net, and a study that runs every day.</Title>
      <div className="mt-12 grid grid-cols-2 gap-8">
        <Reveal show={step >= 0}>
          <div className="matte h-full p-8">
            <p className="font-display text-[56px] font-semibold text-[#ff6b4a]">66%</p>
            <p className="mt-3 text-[21px] leading-snug text-white/75">
              of emergency vignettes were under-triaged by nurses using SATS in a KP district hospital. Triage under pressure is hard; a second, consistent reader helps.
            </p>
            <p className="mt-3 font-mono text-[11px] text-white/35">Dalwai et al., S Afr Med J 2014 · Timergara DHQ Hospital, Pakistan</p>
          </div>
        </Reveal>
        <div className="flex flex-col gap-4 text-[20px]">
          {[
            "Nurse colour recorded before the system's: blinded pairs → weighted kappa, live",
            "Every override logged with a reason; under-triage reviewed case by case",
            "Doctors confirm routing and rate every brief at each consultation",
            "Under-12s skip adult TEWS → paediatric review, YELLOW minimum",
            "Decision support only: the clinician decides, always",
          ].map((t, i) => (
            <Reveal key={t} show={step >= 1 + Math.floor(i / 3)} delay={i * 80}>
              <p className="matte p-5 text-white/85">{t}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </Frame>
  ),
  notes: {
    doctor: "\"We're not replacing your judgement. Under pressure even trained nurses under-triage: in one KP hospital study, two-thirds of emergency vignettes. Priora is a consistent second reader, and the validation dashboard measures agreement with your nurses every single day, blinded. Paediatrics is a known limitation: under-twelves go straight to paediatric review.\"",
  },
};

const techArch: Slide = {
  id: "tech-arch",
  lens: "tech",
  steps: 3,
  render: ({ step }) => (
    <Frame>
      <Eyebrow>For AI experts · architecture</Eyebrow>
      <Title>LLMs where language is messy. Code where decisions matter.</Title>
      <div className="mt-12 grid grid-cols-3 gap-6">
        {[
          ["Front desk (edge)", ["Next.js kiosk on any tablet", "Browser audio → Gemini (multimodal)", "45 pre-recorded Urdu TTS clips", "Priora Lite offline: char+word n-gram logistic regression, trained on 5,176 Gemini-labelled examples, re-implemented in TypeScript", "Red-flag lexicon backstop"]],
          ["AI layer (Vertex AI)", ["Gemini 2.5 Flash: intake, documents with box_2d, cited brief", "Gemini 2.5 Flash-Lite: routing, follow-up planner, fallback", "Zod → JSON schema structured output, validated, retried", "Two-reading self-consistency", "15 s timeout + fallback model"]],
          ["Decisions & data", ["SATS: TEWS + discriminators (deterministic)", "EARS C2 aberration detection", "Monte Carlo lead-time study", "Neon Postgres + Drizzle; private Vercel Blob", "Signed staff sessions, role-scoped APIs, audit log"]],
        ].map(([h, items], i) => (
          <Reveal key={h as string} show={step >= Math.min(i, 2)} delay={i * 120}>
            <div className="matte h-full p-7">
              <p className="font-display text-[28px] font-semibold">{h as string}</p>
              <ul className="mt-4 flex flex-col gap-3 text-[18px] leading-snug text-white/75">
                {(items as string[]).map((x) => (
                  <li key={x} className="border-l-2 border-white/15 pl-3">{x}</li>
                ))}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>
    </Frame>
  ),
  notes: {
    tech: "\"Three layers. At the edge, a web kiosk, pre-recorded Urdu speech for instant playback, and Priora Lite, a model we trained by distilling Gemini into a char and word n-gram classifier that runs in 8 milliseconds in the browser. In the cloud, Gemini 2.5 Flash and Flash-Lite with schema-validated structured output and self-consistency. And every actual decision, severity and outbreaks, is plain deterministic code you can unit-test.\"",
  },
};

const techEval: Slide = {
  id: "tech-eval",
  lens: "tech",
  steps: 2,
  render: ({ step }) => {
    const rows = [
      ["Gemini, single reading", pct1(HS.gemini.accuracy), pct1(HS.gemini.under_triage), pct1(HS.gemini.over_triage)],
      ["Gemini, two readings", pct1(HS.gemini_self_consistency.accuracy), pct1(HS.gemini_self_consistency.under_triage), pct1(HS.gemini_self_consistency.over_triage)],
      ["Priora Lite (offline)", pct1(HS.priora_lite.accuracy), pct1(HS.priora_lite.under_triage), pct1(HS.priora_lite.over_triage)],
      ["Lite + Gemini hybrid", pct1(HS.hybrid.accuracy), pct1(HS.hybrid.under_triage), pct1(HS.hybrid.over_triage)],
    ];
    return (
      <Frame>
        <Eyebrow>For AI experts · evaluation</Eyebrow>
        <Title>{hard.summary.n} adversarial cases, fixed before any run.</Title>
        <p className="mt-3 text-[20px] text-white/50">Hidden red flags, negations, vague complaints, Urdu/English code-switching with typos, relatives speaking, pregnancy, age edges.</p>
        <div className="mt-10 grid grid-cols-[1.4fr_1fr] gap-10">
          <table className="w-full text-left text-[21px] tabular-nums">
            <thead className="font-mono text-[13px] uppercase tracking-wider text-white/45">
              <tr><th className="pb-3">System</th><th className="pb-3">Accuracy</th><th className="pb-3">Under-triage</th><th className="pb-3">Over-triage</th></tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r[0]} className={cn("border-t border-white/10", i === 1 && "text-white", i !== 1 && "text-white/70")}>
                  <td className="py-4 font-semibold">{r[0]}</td><td>{r[1]}</td><td className={cn(i === 1 && "text-[#ff6b4a]")}>{r[2]}</td><td>{r[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Reveal show={step >= 1} className="flex flex-col gap-4">
            <Stat value={`${pct1(syndromes.summary.micro_precision)} / ${pct1(syndromes.summary.micro_recall)}`} label={`syndrome tagging precision / recall (${syndromes.summary.n} cases); dengue recall ${pct(syndromes.summary.dengue_recall)} is the weak spot`} />
            <Stat value={`${pct1(lite.held_out.model.colour_accuracy)}`} label={`Priora Lite on ${lite.held_out.n} held-out examples; weaker on hidden red flags, hence the lexicon + hybrid`} />
          </Reveal>
        </div>
      </Frame>
    );
  },
  notes: {
    tech: "\"We optimised for the dangerous error, under-triage. Two readings trade 1.8 points of over-triage for zero under-triage, the right trade in triage. Our own offline model is honest at 68% on the adversarial set, which is why it's a fallback with a red-flag lexicon, not the primary. Syndrome tagging is 93% precise; dengue recall at 3 of 5 is the weak spot and the next thing to fix. Plus 70 unit tests on the rules.\"",
  },
};

const bizGtm: Slide = {
  id: "biz-gtm",
  lens: "business",
  steps: 3,
  render: ({ step }) => (
    <Frame>
      <Eyebrow>For business · go to market</Eyebrow>
      <Title>The hospital deploys it for queues. The district pays for the network.</Title>
      <div className="mt-12 grid grid-cols-3 gap-6">
        {[
          ["Who uses it", "Front desk, nurses, doctors at public OPDs. Day-one value: sickest first, right room, no paper hunt."],
          ["Who pays", "District health authorities and provincial health departments, the owners of disease surveillance, with partners like NIH and WHO."],
          ["What it costs to deploy", "A tablet and a printer at the existing desk. No new staff. About two short Gemini Flash calls per patient."],
        ].map(([h, t], i) => (
          <Reveal key={h} show={step >= Math.min(i, 1)} delay={i * 120}>
            <div className="matte h-full p-8">
              <p className="font-display text-[30px] font-semibold">{h}</p>
              <p className="mt-4 text-[20px] leading-snug text-white/70">{t}</p>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal show={step >= 2} className="mt-10">
        <div className="flex items-stretch gap-4 text-[22px]">
          {["Pilot: 3 largest OPDs (PIMS, Holy Family, Benazir Bhutto)", "District: all 8 network hospitals", "Province: integrate with IDSR reporting"].map((t, i) => (
            <div key={t} className="flex flex-1 items-stretch gap-4">
              <div className="matte flex-1 p-5"><span className="font-mono text-[13px] text-white/40">0{i + 1}</span><p className="mt-1 leading-snug">{t}</p></div>
              {i < 2 && <span className="self-center text-[30px] text-white/30">→</span>}
            </div>
          ))}
        </div>
      </Reveal>
    </Frame>
  ),
  notes: {
    business: "\"Two customers, one install. Hospitals adopt it because queues get safer and doctors save hours: that's what gets the tablet on the desk. Districts and provinces pay because it gives them surveillance a week earlier. Deployment is a tablet and a printer. We start with the three biggest OPDs in Rawalpindi–Islamabad, because coverage is what makes the early warning work.\"",
  },
};

const bizMoat: Slide = {
  id: "biz-moat",
  lens: "business",
  steps: 2,
  render: ({ step }) => (
    <Frame>
      <Eyebrow>For business · why this wins</Eyebrow>
      <Title>Every hospital that joins makes every alert faster.</Title>
      <div className="mt-12 grid grid-cols-[1fr_1.2fr] gap-10">
        <div className="flex flex-col gap-5">
          <Stat value="1,934 + 5,746" label="hospitals and basic health units in Pakistan" src="Pakistan Economic Survey 2025-26, Table 11.1" />
          <Stat value="34,122" label="dengue-related OPD registrations at just 3 Rawalpindi teaching hospitals in 2025; 4,545 admitted" src="Rawalpindi Medical University, Nov 2025" />
        </div>
        <Reveal show={step >= 1} className="flex flex-col gap-3">
          {[
            ["Network effect", "Alerts depend on pooled coverage: the more hospitals, the earlier and more precise every signal."],
            ["Urdu voice + offline", "A talking kiosk in the patient's language, working through outages with our own model."],
            ["Trust by design", "Standard scales (SATS, CDC EARS), blinded validation, audit trail: what public buyers need to sign."],
            ["Two products, one install", "Hospital operations today; district intelligence as the network grows."],
          ].map(([h, t]) => (
            <div key={h} className="matte px-5 py-4">
              <p className="text-[21px] font-semibold">{h}</p>
              <p className="mt-1 text-[17px] leading-snug text-white/70">{t}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </Frame>
  ),
  notes: {
    business: "\"The market is every public facility: nearly two thousand hospitals and almost six thousand basic health units. The pain is seasonal and huge: three Rawalpindi hospitals alone registered thirty-four thousand dengue-related OPD visits last year. Our moat is the network: once a district's hospitals are connected, alerts get faster with every new site, and a competitor would have to rebuild the whole network.\"",
  },
};

/* ---------- 10. Limits & next ---------- */
const next: Slide = {
  id: "next",
  steps: 2,
  render: ({ step }) => (
    <Frame>
      <Eyebrow>Honest limits · what&apos;s next</Eyebrow>
      <Title>What we know, what we don&apos;t, and the pilot that settles it.</Title>
      <div className="mt-12 grid grid-cols-2 gap-8">
        <div className="flex flex-col gap-4 text-[21px]">
          {[
            "Lead time is simulated; it needs real coverage (≥ ~40%)",
            "Evaluated on written vignettes and voice clips, not yet on live patients",
            "All demo patient and surveillance data is synthetic",
            "Paediatric TEWS and dengue recall need work",
          ].map((t) => (
            <p key={t} className="matte p-5 text-white/80"><span className="mr-2 text-[#ff6b4a]">—</span>{t}</p>
          ))}
        </div>
        <Reveal show={step >= 1} className="flex flex-col gap-4 text-[21px]">
          {[
            "8-week pilot in one OPD: blinded nurse agreement study",
            "Expand to the 3 largest OPDs for real district coverage",
            "Feed alerts into the national IDSR workflow",
            "Learn from every clinician override",
          ].map((t, i) => (
            <p key={t} className="matte p-5"><span className="mr-3 font-mono text-[14px] text-white/40">0{i + 1}</span>{t}</p>
          ))}
        </Reveal>
      </div>
    </Frame>
  ),
  notes: {
    all: "Own the limits before judges raise them, then pivot to the pilot ask.",
    doctor: "\"What I'd want from you is a pilot: one OPD, eight weeks, your nurses' blinded colours against the system. That's how this earns its place.\"",
    tech: "\"The next technical steps: real-patient evaluation, improving dengue recall, and learning from clinician overrides, which are already logged as labelled data.\"",
    business: "\"The ask: a pilot site and a district partner. Everything is built and live today, so a pilot can start in weeks, not months.\"",
  },
};

/* ---------- 11. Close ---------- */
const close: Slide = {
  id: "close",
  render: () => (
    <Frame className="grid grid-cols-[1.25fr_1fr] items-center gap-12">
      <div>
        <h2 className="font-display text-[92px] font-semibold leading-[0.98] tracking-[-0.045em]">Priora sees outbreaks a week before the lab reports do.</h2>
        <p className="mt-10 font-mono text-[22px] text-white/70">priora.asjad.dev</p>
        <p className="mt-2 font-mono text-[15px] text-white/40">kiosk. · hospital. · district. · github.com/asjad2401/aicon</p>
        <p className="mt-12 text-[28px] text-white/55">Thank you.</p>
      </div>
      <div className="flex justify-center">
        <div className="w-[460px]">
          <DistrictRadar />
        </div>
      </div>
    </Frame>
  ),
  notes: {
    all: "\"Three teams triage a patient. Priora triages a district. It's live right now at priora.asjad.dev. Thank you.\"",
  },
};

export const SLIDES: Slide[] = [title, problem, insight, pipeline, demo, evidence, trust, doctorImpact, doctorSafety, techArch, techEval, bizGtm, bizMoat, next, close];
