"use client";

import type { CSSProperties, ReactNode } from "react";
import { Activity, BedDouble, Brain, FileText, ListOrdered, MessageCircleQuestion, Mic, Network, Signpost, Siren, Tags, UserCheck, type LucideIcon } from "lucide-react";
import { DistrictRadar } from "@/components/district-radar";
import { cn } from "@/lib/utils";
import hard from "@/eval/hard-results.json";
import leadtime from "@/eval/leadtime.json";
import lite from "@/ml/model/eval.json";
import syndromes from "@/eval/syndrome-results.json";

type Ctx = { step: number };
export type Slide = { id: string; steps?: number; render: (c: Ctx) => ReactNode; notes: string };

const pct = (x: number) => `${Math.round(x * 100)}%`;
const LT = leadtime.summary;

/* ---------- building blocks ---------- */
function Reveal({ show, children, className, delay = 0, style }: { show: boolean; children: ReactNode; className?: string; delay?: number; style?: CSSProperties }) {
  return (
    <div
      className={cn("transition-all duration-700 ease-out", show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0", className)}
      style={{ ...style, transitionDelay: show ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}
const Eyebrow = ({ children }: { children: ReactNode }) => <p className="font-mono text-[16px] uppercase tracking-[0.2em] text-white/40">{children}</p>;
const Frame = ({ children, className }: { children: ReactNode; className?: string }) => <div className={cn("absolute inset-0 px-[120px] py-[100px]", className)}>{children}</div>;
const Big = ({ children, className }: { children: ReactNode; className?: string }) => (
  <p className={cn("font-display font-semibold leading-[0.95] tracking-[-0.045em]", className)}>{children}</p>
);

/* ---------- 1. Title ---------- */
const title: Slide = {
  id: "title",
  render: () => (
    <Frame className="grid grid-cols-[1.3fr_1fr] items-center gap-12">
      <div>
        <h1 className="font-display text-[92px] font-semibold leading-[0.98] tracking-[-0.045em]">Priora sees outbreaks a week before the lab reports do.</h1>
        <p className="mt-12 font-mono text-[18px] text-white/40">Asjad Ali · AICON&apos;26 · Health Operations</p>
      </div>
      <div className="flex justify-center">
        <div className="w-[520px]">
          <DistrictRadar />
        </div>
      </div>
    </Frame>
  ),
  notes: `
"Hi, I'm Asjad, and I built this solo. Priora sees outbreaks a week before the lab reports do. That radar is live: the three red dots are clusters it flagged today across Islamabad and Rawalpindi."`,
};

/* ---------- 2. Problem ---------- */
const DAYS = 20;
const dx = (d: number) => 80 + (d / DAYS) * 1200;
const EVENTS = [
  { d: 0, day: "Day 0", text: "First patients" },
  { d: 3.5, day: "Day 2–5", text: `~${pct(leadtime.params.testingRate)} get a lab test` },
  { d: 10, day: "Day 10", text: "Weekly report compiled" },
];
const BAR = [0, 3.5, 10, 10, LT.todayMedianDay];
const problem: Slide = {
  id: "problem",
  steps: 5,
  render: ({ step }) => (
    <Frame>
      <Eyebrow>Today</Eyebrow>
      <Big className="mt-5 text-[80px]">Outbreaks are found weeks late.</Big>
      <div className="relative mt-24 h-[160px]">
        <div className="absolute left-[80px] right-[80px] top-[90px] h-[2px] bg-white/15" />
        <div className="absolute top-[80px] h-[22px] rounded-full bg-[#e5482d]/30 transition-all duration-1000 ease-out" style={{ left: dx(0), width: dx(BAR[step]) - dx(0) }} />
        {EVENTS.map((e, i) => (
          <div key={e.day}>
            <Reveal show={step >= i} className="absolute top-0 w-[260px]" style={{ left: dx(e.d) - 11 }}>
              <p className="font-mono text-[18px] text-white/45">{e.day}</p>
              <p className="mt-1 whitespace-nowrap text-[24px]">{e.text}</p>
            </Reveal>
            <span className={cn("absolute top-[80px] size-[22px] rounded-full border-2 border-white bg-[#0b0b0b] transition-opacity duration-500", step >= i ? "opacity-100" : "opacity-0")} style={{ left: dx(e.d) - 11 }} />
          </div>
        ))}
        <Reveal show={step >= 4} delay={700} className="absolute top-0 w-[300px]" style={{ left: dx(LT.todayMedianDay) - 13 }}>
          <p className="font-mono text-[18px] text-[#ff6b4a]">Day {LT.todayMedianDay}</p>
          <p className="mt-1 whitespace-nowrap text-[24px] text-[#ff6b4a]">District notices</p>
        </Reveal>
        <span className={cn("absolute top-[78px] size-[26px] rounded-full bg-[#e5482d] transition-opacity duration-500", step >= 4 ? "opacity-100 delay-700" : "opacity-0")} style={{ left: dx(LT.todayMedianDay) - 13 }} />
      </div>
      <Reveal show={step >= 3} className="mt-16 flex items-end gap-6">
        <Big className="text-[120px] text-[#ff6b4a]">75%</Big>
        <p className="pb-4 text-[30px] text-white/70">of weekly reports arrive.</p>
      </Reveal>
    </Frame>
  ),
  notes: `five quick clicks
1 "Day zero: the first patients with fever reach the OPDs."
2 "Only about a third get a lab test, days later."
3 "The week closes and the report is compiled about three days after that."
4 "And only 75% of those weekly reports even arrive (NIH Pakistan, 2025)."
5 "So the district notices around day 17 (median, in our simulation). In Sindh last year, 819 dengue cases were reported officially while hospitals and labs saw over 12,000 (Dawn)."

If a doctor asks: you see the first fever patients on day zero; the system sees them weeks later.
If a business judge asks: beds, kits and fogging are bought on the wrong number, too late.`,
};

/* ---------- Problem statement ---------- */
const problemStatement: Slide = {
  id: "problem-statement",
  steps: 3,
  render: ({ step }) => (
    <Frame>
      <Eyebrow>Problem statement</Eyebrow>
      <Big className="mt-8 max-w-[1300px] text-[64px] leading-[1.05]">
        Pakistan finds outbreaks weeks late, because the first signal, <span className="text-[#ff6b4a]">what patients say at the front desk</span>, is never captured or
        shared.
      </Big>
      <div className="mt-16 grid grid-cols-3 gap-6">
        {[
          ["819 vs 12,000+", "dengue cases reported vs seen by hospitals, Sindh 2025", "Dawn"],
          ["None", "hospital information systems at any level, Rawalpindi & ICT", "PLoS One 2021"],
          ["8,000+", "patients a day at PIMS alone, all on paper", "The News 2026"],
        ].map(([v, l, src], i) => (
          <Reveal key={v} show={step >= 1} delay={i * 150}>
            <div className="matte h-full p-7">
              <Big className="text-[52px]">{v}</Big>
              <p className="mt-3 text-[20px] leading-snug text-white/65">{l}</p>
              <p className="mt-2 font-mono text-[12px] text-white/35">{src}</p>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal show={step >= 2} className="mt-10">
        <p className="font-display text-[34px] font-semibold">Not a queue problem. A district blind spot.</p>
      </Reveal>
    </Frame>
  ),
  notes: `~20s · three clicks
"Here's the problem we chose. Pakistan finds outbreaks weeks late, because the very first signal, what patients say at the hospital front desk, is never captured and never shared between hospitals. In Sindh last year, 819 dengue cases were reported officially while hospitals saw over twelve thousand. Rawalpindi and Islamabad hospitals have no information systems at any level, and PIMS alone sees eight thousand patients a day on paper. So this isn't a queue problem or a records problem. It's a blind spot for the whole district."

Why this matters vs other teams: triage and hospital-management systems optimise one hospital. Nobody is solving the district's view across hospitals.`,
};

/* ---------- Solution statement ---------- */
const solution: Slide = {
  id: "solution",
  steps: 2,
  render: ({ step }) => (
    <Frame>
      <Eyebrow>Solution statement</Eyebrow>
      <Big className="mt-8 max-w-[1300px] text-[64px] leading-[1.05]">
        Priora turns every front-desk conversation into an anonymous disease signal, through an AI triage nurse that speaks Urdu.
      </Big>
      <Reveal show={step >= 1} className="mt-16 grid grid-cols-2 gap-6">
        <div className="matte p-8">
          <p className="font-mono text-[14px] uppercase tracking-[0.18em] text-white/40">The hospital gets</p>
          <p className="mt-3 font-display text-[36px] font-semibold leading-tight">Safer queues, today.</p>
          <p className="mt-2 text-[22px] text-white/60">Sickest first, right room, cited history.</p>
        </div>
        <div className="matte !border-[#e5482d]/40 p-8">
          <p className="font-mono text-[14px] uppercase tracking-[0.18em] text-[#ff6b4a]">The district gets</p>
          <p className="mt-3 font-display text-[36px] font-semibold leading-tight">Outbreaks, a week earlier.</p>
          <p className="mt-2 text-[22px] text-white/60">Alerts across hospitals, with a surge plan.</p>
        </div>
      </Reveal>
    </Frame>
  ),
  notes: `~15s · two clicks
"Our solution: Priora turns every front-desk conversation into an anonymous disease signal, through an AI triage nurse that speaks Urdu. The hospital gets safer queues today, which is why it gets installed. The district gets outbreak warnings a week earlier, which is why it matters."`,
};

/* ---------- MVP overview ---------- */
const MVP = [
  { k: "Kiosk", u: "kiosk.priora.asjad.dev", t: "Patient speaks Urdu", s: "One follow-up question, aloud · token" },
  { k: "Hospital", u: "hospital.priora.asjad.dev", t: "Nurse and doctor", s: "SATS triage · severity queue · cited briefs" },
  { k: "District", u: "district.priora.asjad.dev", t: "Health officer", s: "Live map · AI alerts · surge plans" },
];
const mvp: Slide = {
  id: "mvp",
  steps: 4,
  render: ({ step }) => (
    <Frame>
      <Eyebrow>The MVP · live today</Eyebrow>
      <Big className="mt-5 text-[72px]">Three portals. One network.</Big>
      <div className="mt-16 flex items-stretch gap-5">
        {MVP.map((m, i) => (
          <div key={m.k} className="flex flex-1 items-stretch gap-5">
            <Reveal show={step >= i} className="flex-1">
              <div className={cn("h-full p-8", i === 2 ? "matte !border-[#e5482d]/40" : "matte")}>
                <p className={cn("font-mono text-[14px] uppercase tracking-[0.18em]", i === 2 ? "text-[#ff6b4a]" : "text-white/40")}>{m.k}</p>
                <p className="mt-3 font-display text-[34px] font-semibold leading-tight">{m.t}</p>
                <p className="mt-3 text-[21px] leading-snug text-white/60">{m.s}</p>
                <p className="mt-6 font-mono text-[13px] text-white/35">{m.u}</p>
              </div>
            </Reveal>
            {i < MVP.length - 1 && <span className={cn("self-center text-[34px] text-white/30 transition-opacity duration-500", step > i ? "opacity-100" : "opacity-0")}>→</span>}
          </div>
        ))}
      </div>
      <Reveal show={step >= 3} className="mt-10">
        <p className="font-mono text-[20px] text-white/50">8 hospitals · 20 areas · works offline · priora.asjad.dev</p>
      </Reveal>
    </Frame>
  ),
  notes: `~20s · four clicks
"What we built, live today: three portals on one network. The patient talks to a kiosk in Urdu and gets a token. The nurse and doctor get SATS triage, a severity-sorted queue and a cited history brief. And the district health officer gets a live map across eight hospitals and twenty areas, with AI alerts and surge plans. It even keeps working offline."`,
};

/* ---------- 4. Pipeline ---------- */
type Kind = "AI" | "RULES" | "PEOPLE";
type Node = { label: string; icon: LucideIcon; kind: Kind; x: number; y: number };
const TOP = 330;
const BOT = 600;
const TX = (i: number) => 220 + i * 210;
const BX = (i: number) => 430 + i * 262;
const PATIENT: Node[] = [
  { label: "Speak", icon: Mic, kind: "PEOPLE", x: TX(0), y: TOP },
  { label: "Understand", icon: Brain, kind: "AI", x: TX(1), y: TOP },
  { label: "Ask", icon: MessageCircleQuestion, kind: "AI", x: TX(2), y: TOP },
  { label: "Prioritise", icon: ListOrdered, kind: "RULES", x: TX(3), y: TOP },
  { label: "Route", icon: Signpost, kind: "AI", x: TX(4), y: TOP },
  { label: "Confirm", icon: UserCheck, kind: "PEOPLE", x: TX(5), y: TOP },
  { label: "Brief", icon: FileText, kind: "AI", x: TX(6), y: TOP },
];
const DISTRICT: Node[] = [
  { label: "Tag", icon: Tags, kind: "AI", x: BX(0), y: BOT },
  { label: "Pool", icon: Network, kind: "RULES", x: BX(1), y: BOT },
  { label: "Detect", icon: Activity, kind: "RULES", x: BX(2), y: BOT },
  { label: "Alert", icon: Siren, kind: "AI", x: BX(3), y: BOT },
  { label: "Plan", icon: BedDouble, kind: "RULES", x: BX(4), y: BOT },
];
const KIND: Record<Kind, string> = { AI: "bg-white text-black", RULES: "border border-white/60", PEOPLE: "border border-dashed border-white/50 text-white/80" };

const NODES = [...PATIENT, ...DISTRICT];

function Pipeline({ step }: Ctx) {
  const active = step - 1; // 0 = overview; 1..12 = node; 13 = summary
  const lit = (i: number) => active >= i;
  const cur = NODES[Math.min(active, NODES.length - 1)];
  const seg = (a: Node, b: Node, on: boolean, key: string) => (
    <line key={key} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={on ? "#ededed" : "#2a2a2a"} strokeWidth={on ? 3 : 2} strokeDasharray={on ? "0" : "6 6"} style={{ transition: "stroke 0.5s" }} />
  );
  return (
    <Frame className="py-[80px]">
      <div className="flex items-center justify-between">
        <Eyebrow>How it works</Eyebrow>
        <div className={cn("flex gap-3 font-mono text-[14px] transition-opacity duration-700", active >= NODES.length ? "opacity-100" : "opacity-0")}>
          <span className={cn("rounded-full px-3 py-1", KIND.AI)}>AI reads</span>
          <span className={cn("rounded-full px-3 py-1", KIND.RULES)}>Rules decide</span>
          <span className={cn("rounded-full px-3 py-1", KIND.PEOPLE)}>People confirm</span>
        </div>
      </div>
      <Big className="mt-5 text-[60px]">One patient. Then the whole district.</Big>
      <div className="absolute inset-0">
        <svg className="absolute inset-0" width={1600} height={900}>
          {PATIENT.slice(0, -1).map((n, i) => seg(n, PATIENT[i + 1], lit(i + 1), `t${i}`))}
          {seg(PATIENT[1], DISTRICT[0], lit(PATIENT.length), "down")}
          {DISTRICT.slice(0, -1).map((n, i) => seg(n, DISTRICT[i + 1], lit(PATIENT.length + i + 1), `b${i}`))}
        </svg>
        <p className={cn("absolute left-[64px] w-[220px] -translate-x-1/2 -rotate-90 text-center font-mono text-[13px] uppercase tracking-[0.2em] transition-colors duration-500", lit(0) ? "text-white/50" : "text-white/20")} style={{ top: TOP - 10 }}>
          Every front desk
        </p>
        <p className={cn("absolute left-[64px] w-[220px] -translate-x-1/2 -rotate-90 text-center font-mono text-[13px] uppercase tracking-[0.2em] transition-colors duration-500", lit(PATIENT.length) ? "text-[#ff6b4a]" : "text-white/20")} style={{ top: BOT - 10 }}>
          Whole district
        </p>
        {NODES.map((n, i) => {
          const Icon = n.icon;
          const on = lit(i);
          const here = active === i;
          return (
            <div
              key={n.label}
              className={cn("absolute flex w-[180px] -translate-x-1/2 -translate-y-[48px] flex-col items-center transition-all duration-500", on ? "opacity-100" : "opacity-25", here && "scale-110")}
              style={{ left: n.x, top: n.y }}
            >
              <span
                className={cn(
                  "flex size-[96px] items-center justify-center rounded-2xl border transition-all duration-500",
                  here ? "border-white bg-white text-black shadow-[0_0_40px_rgba(255,255,255,0.25)]" : on ? "border-white/50 bg-[#1f1f1f]" : "border-[#2e2e2e] bg-[#141414]",
                )}
              >
                <Icon className="size-10" />
              </span>
              <span className="mt-4 text-[22px] font-semibold">{n.label}</span>
              <span className={cn("mt-2 rounded-full px-2.5 py-0.5 font-mono text-[11px]", KIND[n.kind])}>{n.kind}</span>
            </div>
          );
        })}
        <span
          className="absolute size-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e5482d] shadow-[0_0_28px_10px_rgba(229,72,45,0.5)] transition-all duration-700 ease-in-out"
          style={{ left: (cur?.x ?? TX(0)) + 56, top: (cur?.y ?? TOP) - 56, opacity: active >= 0 && active < NODES.length ? 1 : 0 }}
        />
      </div>
    </Frame>
  );
}
const pipeline: Slide = {
  id: "pipeline",
  steps: NODES.length + 2,
  render: (c) => <Pipeline {...c} />,
  notes: `one click per step, keep moving
Speak: "The patient speaks in Urdu at the kiosk."
Understand: "Gemini understands, reading twice for safety."
Ask: "It asks one follow-up question, aloud."
Prioritise: "The South African Triage Scale, plain rules, sets the priority, not the AI."
Route: "It sends them to the right department."
Confirm: "The nurse confirms, recording her own colour first."
Brief: "The doctor gets a cited brief from old reports."
Tag: "The same conversation is tagged with a syndrome, like dengue-like fever."
Pool: "Pooled anonymously across eight hospitals."
Detect: "A standard CDC statistical check flags unusual clusters."
Alert: "The health officer gets an AI-written, cited alert."
Plan: "And a three-day surge plan: beds, test kits, ORS."
Last click: "AI reads. Rules decide. People confirm."

If a doctor asks: severity is always SATS; the nurse records her own colour blind first; only an anonymous syndrome tag and area leave the hospital.
If an AI expert asks: Gemini 2.5 Flash and Flash-Lite on Vertex; schema-validated structured output; two readings at different temperatures; brief lines without a real citation are dropped; our own offline model (n-gram classifier, 8 ms) when the internet drops; outbreak detection is CDC EARS C2, deterministic.
If a business judge asks: one install, two products. Hospitals adopt it for safer queues; districts pay for the early warning. Each new hospital makes every alert faster.`,
};

/* ---------- AI depth: every level, every level checked ---------- */
const LEVELS: { level: string; io: string; ai: string; guard: string; metric: string; unit: string }[] = [
  { level: "Listen", io: "Urdu speech → symptoms", ai: "Gemini reads speech into symptoms, danger signs and syndromes", guard: "Read twice; the more urgent reading wins", metric: pct(hard.summary.systems.gemini_self_consistency.under_triage), unit: `missed emergencies · ${hard.summary.n} hard cases` },
  { level: "Ask & route", io: "Gaps → 1 question", ai: "Plans the one question that could change priority; routes the patient", guard: "Fixed bank of 45 clinician-reviewable Urdu questions", metric: `${hard.summary.voice.voice.n}/${hard.summary.voice.voice.n}`, unit: "real voice clips triaged right" },
  { level: "Read", io: "Old paper → cited brief", ai: "Reads photographed reports with bounding boxes; writes the doctor's brief", guard: "Any line without a real source is dropped", metric: "100%", unit: "of shown brief lines cited (enforced)" },
  { level: "Watch", io: "Every intake → district signal", ai: "Tags syndromes; writes the officer's alert from computed statistics", guard: "Outbreak call is CDC EARS maths; actions from a fixed checklist", metric: `${pct(syndromes.summary.micro_precision)} / ${pct(syndromes.summary.micro_recall)}`, unit: `syndrome precision / recall · ${syndromes.summary.n} cases` },
  { level: "Survive", io: "No internet → still triage", ai: "Priora Lite: our own model, distilled from 5,176 Gemini-labelled examples", guard: "Red-flag lexicon backstop", metric: `${Math.round(lite.latency_ms)} ms`, unit: `in the browser · ${pct(lite.held_out.model.colour_accuracy)} held-out accuracy` },
];
const aiDepth: Slide = {
  id: "ai-depth",
  steps: LEVELS.length + 1,
  render: ({ step }) => (
    <Frame className="py-[70px]">
      <div className="flex items-start justify-between">
        <Eyebrow>AI integration depth</Eyebrow>
        <div className="flex gap-10">
          {[
            ["7", "AI components"],
            ["1", "model we trained"],
            ["5", "checks"],
            ["4", "eval sets"],
          ].map(([n, l]) => (
            <div key={l} className="text-right">
              <p className="font-display text-[40px] font-semibold leading-none">{n}</p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-white/45">{l}</p>
            </div>
          ))}
        </div>
      </div>
      <Big className="-mt-2 whitespace-nowrap text-[54px]">AI at every level. Every level checked.</Big>
      <div className="mt-10 grid grid-cols-[230px_1fr_1fr_270px] gap-x-4 px-2 font-mono text-[12px] uppercase tracking-[0.15em] text-white/35">
        <span>Level</span>
        <span>What the AI does</span>
        <span>The check on it</span>
        <span className="text-right">Measured</span>
      </div>
      <div className="mt-3 flex flex-col gap-[10px]">
        {LEVELS.map((l, i) => (
          <Reveal key={l.level} show={step >= i + 1}>
            <div className="grid grid-cols-[230px_1fr_1fr_270px] items-center gap-x-4">
              <div className="matte flex h-[92px] flex-col justify-center px-5">
                <p className="font-display text-[26px] font-semibold leading-none">{l.level}</p>
                <p className="mt-2 text-[14px] text-white/45">{l.io}</p>
              </div>
              <div className="flex h-[92px] items-center rounded-2xl bg-white px-5 text-[18px] font-medium leading-snug text-black">{l.ai}</div>
              <div className="flex h-[92px] items-center rounded-2xl border border-white/40 px-5 text-[18px] leading-snug text-white/80">{l.guard}</div>
              <div className="flex h-[92px] flex-col items-end justify-center text-right">
                <p className={cn("font-display text-[42px] font-semibold leading-none", i === 0 && "text-[#ff6b4a]")}>{l.metric}</p>
                <p className="mt-2 text-[13px] leading-snug text-white/50">{l.unit}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Frame>
  ),
  notes: `~30s · one row per click, from the patient to the district
"Most projects put AI in one box. Ours runs at five levels, and every level has a check and a measured number.
Listen: Gemini turns Urdu speech into symptoms and syndromes. It reads twice and keeps the more urgent reading: zero missed emergencies on 110 hard cases.
Ask and route: it plans the one question that could change priority, from a fixed bank of 45 reviewed Urdu questions. 30 of 30 real voice clips triaged right.
Read: it reads photographed old reports and writes the doctor's brief, and any line without a real source is dropped.
Watch: it tags syndromes for the district and writes the officer's alert, but the outbreak call itself is CDC statistics and the actions come from a fixed checklist. 93% precision.
Survive: when the internet drops, our own model, distilled from five thousand Gemini-labelled examples, triages in 8 milliseconds in the browser.
Seven AI components, one model we trained ourselves, five checks, four evaluation sets."

Rulebook mapping if asked: each row is Data → AI → Output (the small line under each level), and the whole stack ends in the impact numbers on the proof slide.
If an AI expert asks: structured output from Zod schemas, validated and retried on a fallback model; self-consistency at two temperatures; Gemini 2.5 Flash + Flash-Lite on Vertex AI; Lite is char+word n-gram logistic regression re-implemented in TypeScript.`,
};

/* ---------- Architecture ---------- */
const ROW = [250, 455, 660];
function Box({ x, y, w, h, kind, title, lines, show, delay = 0 }: { x: number; y: number; w: number; h: number; kind: "AI" | "RULES" | "PEOPLE" | "DATA"; title: string; lines?: string[]; show: boolean; delay?: number }) {
  const style = kind === "AI" ? "bg-white text-black" : kind === "PEOPLE" ? "border border-dashed border-white/40 bg-[#141414]" : kind === "DATA" ? "border border-white/25 bg-[#141414]" : "matte";
  return (
    <div className={cn("absolute rounded-2xl px-5 py-4 transition-all duration-700", style, show ? "opacity-100" : "translate-y-4 opacity-0")} style={{ left: x, top: y, width: w, height: h, transitionDelay: show ? `${delay}ms` : "0ms" }}>
      <p className="text-[20px] font-semibold leading-tight">{title}</p>
      {lines?.map((l) => (
        <p key={l} className={cn("mt-1 text-[15px] leading-snug", kind === "AI" ? "text-black/60" : "text-white/55")}>{l}</p>
      ))}
    </div>
  );
}
const architecture: Slide = {
  id: "architecture",
  steps: 4,
  render: ({ step }) => {
    const line = (x1: number, y1: number, x2: number, y2: number, on: boolean, key: string, red = false) => (
      <line key={key} x1={x1} y1={y1} x2={x2} y2={y2} stroke={red ? "#e5482d" : "#ededed"} strokeOpacity={on ? 0.7 : 0} strokeWidth={2} markerEnd={`url(#${red ? "ar" : "aw"})`} style={{ transition: "stroke-opacity 0.6s" }} />
    );
    return (
      <Frame className="py-[80px]">
        <div className="flex items-center justify-between">
          <Eyebrow>Architecture</Eyebrow>
          <div className="flex gap-3 font-mono text-[13px]">
            <span className="rounded-full bg-white px-3 py-1 text-black">AI</span>
            <span className="rounded-full border border-white/50 px-3 py-1">Rules / app</span>
            <span className="rounded-full border border-dashed border-white/50 px-3 py-1">People</span>
            <span className="rounded-full border border-white/25 px-3 py-1 text-white/60">Data</span>
          </div>
        </div>
        <Big className="mt-5 text-[56px]">Who sees what, and where AI runs.</Big>
        <svg className="absolute inset-0" width={1600} height={900}>
          <defs>
            <marker id="aw" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#ededed" /></marker>
            <marker id="ar" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#e5482d" /></marker>
          </defs>
          {ROW.map((y, i) => line(430, y + 70, 538, y + 70, step >= 1, `ua${i}`))}
          {line(940, ROW[0] + 55, 1068, ROW[0] + 55, step >= 2, "ai1")}
          {line(870, ROW[1] + 25, 1068, ROW[1] + 25, step >= 2, "ai2")}
          {line(940, ROW[2] + 70, 1068, ROW[2] + 70, step >= 3, "db")}
          {line(905, ROW[0] + 126, 905, ROW[2] - 4, step >= 3, "anon", true)}
        </svg>
        <p className={cn("absolute font-mono text-[13px] text-[#ff6b4a] transition-opacity duration-700", step >= 3 ? "opacity-100" : "opacity-0")} style={{ left: 712, top: ROW[1] + 122 }}>
          anonymous tags only
        </p>
        <Box show x={120} y={ROW[0]} w={310} h={140} kind="PEOPLE" title="Patient" lines={["Kiosk · kiosk.priora.asjad.dev", "Urdu voice, one question, token"]} />
        <Box show x={120} y={ROW[1]} w={310} h={140} kind="PEOPLE" title="Nurse · Doctor · Records" lines={["Hospital portal · hospital.", "Triage, queue, briefs, validation"]} />
        <Box show x={120} y={ROW[2]} w={310} h={140} kind="PEOPLE" title="District health officer" lines={["District portal · district.", "Map, alerts, surge plans"]} />
        <Box show={step >= 1} x={540} y={ROW[0] + 15} w={400} h={110} kind="RULES" title="Intake → SATS rules → queue" lines={["Deterministic triage (TEWS + discriminators)"]} />
        <Box show={step >= 1} x={540} y={ROW[1]} w={330} h={110} kind="RULES" title="Records & consultations" lines={["Old reports, history, audit"]} delay={120} />
        <Box show={step >= 1} x={540} y={ROW[2]} w={400} h={140} kind="RULES" title="Surveillance" lines={["Daily counts per area × syndrome", "CDC EARS check → surge projection"]} delay={240} />
        <Box show={step >= 2} x={1070} y={ROW[0]} w={410} h={130} kind="AI" title="Gemini 2.5 Flash · Vertex AI" lines={["Speech → symptoms + syndromes (×2)", "Reads reports · writes cited briefs & alerts"]} />
        <Box show={step >= 2} x={1070} y={ROW[1] - 15} w={410} h={80} kind="AI" title="Gemini 2.5 Flash-Lite" lines={["Routing · follow-up planner · fallback"]} delay={120} />
        <Box show={step >= 2} x={1070} y={ROW[1] + 75} w={410} h={80} kind="AI" title="Priora Lite (our model)" lines={["Offline triage in the browser · 8 ms"]} delay={240} />
        <Box show={step >= 3} x={1070} y={ROW[2] + 15} w={410} h={110} kind="DATA" title="Neon Postgres · Vercel Blob" lines={["Visits, staff, audit · private report photos"]} />
      </Frame>
    );
  },
  notes: `~20s · four clicks
1 "Three audiences, three front doors: the patient at the kiosk, hospital staff on the hospital portal, the district health officer on the district portal."
2 "Behind them, one app. The decisions are deterministic: SATS rules for severity, the CDC EARS check for outbreaks."
3 "AI runs here: Gemini Flash for speech, symptoms, documents, briefs and alerts; Flash-Lite for routing and the follow-up question; and our own model, Priora Lite, offline in the browser."
4 "Data stays in Postgres and private storage. Only anonymous syndrome tags flow to the district."`,
};

/* ---------- For clinicians ---------- */
const CLIN = [
  ["SATS decides severity.", "AI never does."],
  ["The nurse colours first,", "blinded."],
  ["Every brief line", "links to its source."],
  ["Under-12s go to", "paediatric review."],
  ["RED waits 1 minute,", "not 65 (simulated)."],
  ["Works offline.", "No new staff."],
];
const clinicians: Slide = {
  id: "clinicians",
  steps: 2,
  render: ({ step }) => (
    <Frame>
      <Eyebrow>For doctors and nurses</Eyebrow>
      <Big className="mt-5 text-[64px]">Your judgement stays in charge.</Big>
      <div className="mt-14 grid grid-cols-3 gap-5">
        {CLIN.map(([a, b], i) => (
          <Reveal key={a} show={step >= Math.floor(i / 3)} delay={(i % 3) * 120}>
            <div className="matte h-[190px] p-7">
              <p className="font-display text-[32px] font-semibold leading-tight">{a}</p>
              <p className="mt-2 text-[24px] text-white/55">{b}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </Frame>
  ),
  notes: `~20s · two clicks
"For clinicians: severity comes from the South African Triage Scale, never from the AI. The nurse records her own colour before seeing the system's, so we measure agreement every day. Every line in the doctor's brief links to the original report, and lines without a real source are dropped. Under-twelves go straight to paediatric review. In our simulated OPD morning, a RED patient waits about a minute instead of over an hour. And it keeps working offline, with no new staff."

If a doctor asks: in a KP district hospital study, nurses using SATS under-triaged 66% of emergency vignettes (Dalwai 2014); Priora is a consistent second reader, not a replacement.`,
};

/* ---------- Value at scale ---------- */
const value: Slide = {
  id: "value",
  steps: 3,
  render: ({ step }) => (
    <Frame>
      <Eyebrow>At scale</Eyebrow>
      <Big className="mt-5 text-[64px]">A national early-warning network.</Big>
      <div className="mt-14 grid grid-cols-[1fr_1.15fr] gap-12">
        <div>
          <Big className="text-[110px]">7,680</Big>
          <p className="mt-4 text-[26px] text-white/60">public hospitals and basic health units</p>
          <p className="mt-2 font-mono text-[13px] text-white/35">1,934 + 5,746 · Pakistan Economic Survey 2025-26</p>
        </div>
        <div className="flex flex-col gap-4">
          {[
            ["One install, two products", "Hospitals: safer queues. Districts: early warning."],
            ["Network effect", "Every hospital that joins speeds up every alert."],
            ["Cheap to deploy", "A tablet and a printer at the existing desk."],
            ["SDG 3.d", "Early warning for national health risks."],
          ].map(([h, t], i) => (
            <Reveal key={h} show={step >= Math.min(2, i)} delay={(i % 2) * 120}>
              <div className="matte flex items-baseline gap-4 px-6 py-5">
                <p className="w-[300px] shrink-0 text-[24px] font-semibold">{h}</p>
                <p className="text-[21px] text-white/60">{t}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </Frame>
  ),
  notes: `~20s · three clicks
"At scale, this is a national early-warning network. Pakistan has about 7,700 public hospitals and basic health units. One install gives two products: hospitals adopt it for safer queues, which gets it onto the desk; districts and provinces pay for the early warning. Every hospital that joins makes every alert faster: that's the network effect and the moat. It costs a tablet and a printer, and it maps directly onto SDG target 3.d: early warning for national health risks."

If a business judge asks who pays: district health authorities and provincial health departments, who own disease surveillance, with partners like NIH and WHO. Pilot: the 3 largest OPDs, then all 8 network hospitals, then integration with national IDSR reporting.`,
};

/* ---------- 5. Demo ---------- */
const demo: Slide = {
  id: "demo",
  render: () => (
    <Frame className="flex flex-col justify-center">
      <Eyebrow>Live</Eyebrow>
      <Big className="mt-8 text-[180px]">Demo</Big>
      <p className="mt-10 font-mono text-[24px] text-white/45">priora.asjad.dev</p>
    </Frame>
  ),
  notes: `switch to the browser tabs
1. Kiosk: code AHMED54K7Q → Find me → mic: "Seenay mein dard hai, baayen baazu tak ja raha hai, paseena aa raha hai." Answer the follow-up → Correct.
2. Nurse: open his token → HR 130 · RR 30 · BP 95 · Temp 37 → pick ORANGE yourself → system says RED → Confirm.
3. Doctor (/doctor/emergency): Ahmed on top → open the brief → click one citation.
4. District: click the G-9 dengue alert → chart, hospitals, AI brief, surge plan.
If anything fails, go straight to the next slide.`,
};

/* ---------- 6. Proof ---------- */
const HIST = LT.leadHistogram.filter((h) => h.days >= -14 && h.days <= 28);
const HMAX = Math.max(...HIST.map((h) => h.count));
const proof: Slide = {
  id: "proof",
  steps: 3,
  render: ({ step }) => (
    <Frame>
      <Eyebrow>Proof</Eyebrow>
      <div className="mt-10 grid grid-cols-[1fr_1fr] items-end gap-16">
        <div>
          <Big className="text-[150px]">{LT.medianLeadDays} days</Big>
          <p className="mt-4 text-[30px] text-white/60">earlier warning</p>
        </div>
        <div className="flex h-[260px] items-end gap-[5px]">
          {HIST.map((h, i) => (
            <div
              key={h.days}
              className="animate-in slide-in-from-bottom-4 fade-in flex-1 rounded-t-[3px] fill-mode-both duration-700"
              style={{ height: `${(h.count / HMAX) * 100}%`, background: h.days > 0 ? "#ededed" : "#3f3f3f", animationDelay: `${i * 15}ms` }}
            />
          ))}
        </div>
      </div>
      <div className="mt-20 grid grid-cols-2 gap-16">
        <Reveal show={step >= 1}>
          <Big className="text-[88px]">
            {pct(LT.prioraDetectedWithin14)} <span className="text-white/35">vs {pct(LT.todayDetectedWithin14)}</span>
          </Big>
          <p className="mt-3 text-[26px] text-white/60">outbreaks caught within 2 weeks</p>
        </Reveal>
        <Reveal show={step >= 2}>
          <Big className="text-[88px] text-[#ff6b4a]">{pct(hard.summary.systems.gemini_self_consistency.under_triage)}</Big>
          <p className="mt-3 text-[26px] text-white/60">missed emergencies · {hard.summary.n} hard cases</p>
        </Reveal>
      </div>
    </Frame>
  ),
  notes: `
"Across a thousand simulated outbreaks, Priora warns a median seven days earlier, and catches 87% within two weeks versus 39% today. On 110 cases written to trick it, it missed zero emergencies, and it triaged 30 out of 30 real Urdu and English voice clips correctly."

Be honest if asked: the lead time is a simulation; it needs about 40% of patients passing a kiosk. Only the 75% report figure is sourced; the rest are stated assumptions you can change at /impact.
If an AI expert asks: single reading 93.6% accuracy with 0.9% under-triage; two readings 0% under-triage for 1.8 points more over-triage; syndrome tagging 93% precision, 87% recall; our offline model 68% on the hard set, so it's the fallback, not the primary.`,
};

/* ---------- 7. Questions ---------- */
const close: Slide = {
  id: "questions",
  render: () => (
    <Frame className="grid grid-cols-[1.3fr_1fr] items-center gap-12">
      <div>
        <Big className="text-[150px]">Questions?</Big>
        <p className="mt-12 font-mono text-[26px] text-white/60">priora.asjad.dev</p>
      </div>
      <div className="flex justify-center">
        <div className="w-[480px]">
          <DistrictRadar />
        </div>
      </div>
    </Frame>
  ),
  notes: `
"It's live today. The next step is an eight-week pilot in the three biggest OPDs: PIMS, Holy Family and Benazir Bhutto. Three teams triage a patient. Priora triages a district. Thank you. Happy to take questions."`,
};

export const SLIDES: Slide[] = [title, problemStatement, problem, solution, mvp, pipeline, architecture, aiDepth, clinicians, demo, proof, value, close];
