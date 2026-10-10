"use client";

import type { CSSProperties, ReactNode } from "react";
import { Activity, BedDouble, Brain, FileText, ListOrdered, MessageCircleQuestion, Mic, Network, Signpost, Siren, Tags, UserCheck, type LucideIcon } from "lucide-react";
import { DistrictRadar } from "@/components/district-radar";
import { cn } from "@/lib/utils";
import hard from "@/eval/hard-results.json";
import leadtime from "@/eval/leadtime.json";

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
  notes: `0:00–0:15
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
  notes: `0:15–0:40 · five quick clicks
1 "Day zero: the first patients with fever reach the OPDs."
2 "Only about a third get a lab test, days later."
3 "The week closes and the report is compiled about three days after that."
4 "And only 75% of those weekly reports even arrive (NIH Pakistan, 2025)."
5 "So the district notices around day 17 (median, in our simulation). In Sindh last year, 819 dengue cases were reported officially while hospitals and labs saw over 12,000 (Dawn)."

If a doctor asks: you see the first fever patients on day zero; the system sees them weeks later.
If a business judge asks: beds, kits and fogging are bought on the wrong number, too late.`,
};

/* ---------- 3. Insight ---------- */
const insight: Slide = {
  id: "insight",
  steps: 2,
  render: ({ step }) => (
    <Frame className="flex flex-col justify-center">
      <Eyebrow>Day one, at the front desk</Eyebrow>
      <p className="mt-10 font-urdu text-[72px] leading-[1.9]" dir="rtl">تین دن سے تیز بخار، جسم میں شدید درد</p>
      <p className="mt-2 text-[34px] text-white/50">&ldquo;High fever for three days, severe body aches.&rdquo;</p>
      <Reveal show={step >= 1} className="mt-14">
        <Big className="text-[64px]">
          That&apos;s a <span className="text-[#ff6b4a]">dengue signal</span>. Today it&apos;s lost on paper.
        </Big>
      </Reveal>
    </Frame>
  ),
  notes: `0:40–0:55
"But the first signal is spoken on day one, at the front desk. PIMS sees over 8,000 patients a day, consultations last under two minutes, and it's all on paper. Priora captures what patients already say."`,
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
  notes: `0:55–1:40 · one click per step, keep moving
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
  notes: `1:40–3:00 · switch to the browser tabs
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
  notes: `3:00–3:30
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
  notes: `3:30–3:50
"It's live today. The next step is an eight-week pilot in the three biggest OPDs: PIMS, Holy Family and Benazir Bhutto. Three teams triage a patient. Priora triages a district. Thank you. Happy to take questions."`,
};

export const SLIDES: Slide[] = [title, problem, insight, pipeline, demo, proof, close];
