"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Keyboard, Loader2, Mic, RotateCcw, Square, Check, Volume2, VolumeX, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TriageBadge } from "@/components/triage-badge";
import { DEPARTMENT_BY_ID } from "@/lib/routing/departments";
import { AREAS } from "@/lib/surveillance/config";
import type { Intake } from "@/lib/ai/intake";
import type { Routing } from "@/lib/routing/route";
import type { TriageResult } from "@/lib/triage/sats";
import { cn } from "@/lib/utils";
import { useRecorder } from "./use-recorder";
import { useVoice } from "./use-voice";
import { voiceUrl } from "@/lib/voice/phrases";

type Analysis = {
  offline: boolean;
  intake: Intake;
  triage: TriageResult;
  routing: Routing;
  model: string;
  ms: number;
  knownHistoryUsed: number;
  followUp?: FollowUp | null;
};
type Returning = { passportToken: string; name: string | null; reports: number };
type Step = "details" | "describe" | "processing" | "followup" | "confirm" | "saving";
type FollowUp = { target: string; why: string; question_ur: string; question_en: string };
type Sex = "male" | "female";

function Bilingual({ ur, en, className }: { ur: string; en: string; className?: string }) {
  return (
    <div className={cn("text-center", className)}>
      <p className="font-urdu text-3xl" dir="rtl">{ur}</p>
      <p className="mt-1 text-lg text-muted-foreground">{en}</p>
    </div>
  );
}

const PAIN_FACES = ["😀", "🙂", "😐", "🙁", "😣", "😫"];

/** 0–10 pain scale with faces: the patient's own rating feeds SATS pain rules directly. */
function PainScale({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="flex w-full flex-col items-center gap-2">
      <p className="text-sm text-muted-foreground">
        How bad is the pain? (optional) · <span className="font-urdu">درد کتنا ہے؟</span>
      </p>
      <div className="flex flex-wrap justify-center gap-1">
        {Array.from({ length: 11 }, (_, n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? null : n)}
            className={cn(
              "flex h-12 w-11 flex-col items-center justify-center rounded-lg border text-xs tabular-nums",
              value === n ? "border-primary bg-primary/10 font-semibold" : "hover:bg-muted",
            )}
          >
            <span className="text-base leading-none">{PAIN_FACES[Math.min(5, Math.floor(n / 2))]}</span>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Kiosk({ hospital }: { hospital: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("details");
  const voice = useVoice();
  const [colourBefore, setColourBefore] = useState<string | null>(null);
  const [answering, setAnswering] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<Sex | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);
  const [pain, setPain] = useState<number | null>(null);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [area, setArea] = useState("");
  const [code, setCode] = useState("");
  const [returning, setReturning] = useState<Returning | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  async function lookup() {
    setLookupError(null);
    const res = await fetch(`/api/patients/lookup?code=${encodeURIComponent(code.trim())}`);
    const data = await res.json();
    if (!res.ok) {
      setLookupError("Code not recognised · کوڈ درست نہیں");
      return;
    }
    setReturning(data);
    if (data.name) setName(data.name);
    if (data.age != null) setAge(String(data.age));
    if (data.sex === "male" || data.sex === "female") setSex(data.sex);
  }

  async function analyze(input: { audio?: Blob; text?: string }) {
    setStep("processing");
    setError(null);
    const form = new FormData();
    if (input.audio) form.append("audio", input.audio, "speech");
    if (input.text) form.append("text", input.text);
    form.append("age", age);
    if (pain != null) form.append("pain", String(pain));
    if (offlineMode) form.append("offline", "1");
    if (sex) form.append("sex", sex);
    if (returning) form.append("passport", returning.passportToken);
    try {
      const res = await fetch("/api/intake/analyze", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAnalysis(data);
      setColourBefore(null);
      if (data.followUp) {
        setStep("followup");
        voice.say([voiceUrl("line", "one_question"), voiceUrl("q", data.followUp.target)]);
      } else {
        setStep("confirm");
        speakDirections(data);
      }
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Something went wrong. Please try again.");
      setStep("describe");
    }
  }

  const recorder = useRecorder((audio) => void analyze({ audio }));

  function speakDirections(a: Pick<Analysis, "triage" | "routing">) {
    voice.say([a.triage.colour === "RED" ? voiceUrl("line", "emergency_now") : voiceUrl("dept", a.routing.department)]);
  }

  async function answerFollowUp(answer: "yes" | "no" | "unsure") {
    if (!analysis?.followUp) return;
    voice.stop();
    setAnswering(true);
    try {
      const res = await fetch("/api/intake/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intake: analysis.intake,
          routing: analysis.routing,
          age: age ? Number(age) : undefined,
          sex: sex ?? undefined,
          target: analysis.followUp.target,
          answer,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setColourBefore(analysis.triage.colour);
      const updated = { ...analysis, intake: data.intake, triage: data.triage, routing: data.routing };
      setAnalysis(updated);
      setStep("confirm");
      speakDirections(updated);
    } catch {
      setError("Could not record your answer. Please continue.");
      setStep("confirm");
    } finally {
      setAnswering(false);
    }
  }

  async function confirm() {
    if (!analysis) return;
    setStep("saving");
    try {
      const res = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || undefined,
          age: age ? Number(age) : undefined,
          sex: sex ?? undefined,
          intake: analysis.intake,
          routing: analysis.routing,
          model: analysis.model,
          passportToken: returning?.passportToken,
          area: area || undefined,
          hospital,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/token/${data.visitId}`);
    } catch {
      setError("Could not create your token. Please try again.");
      setStep("confirm");
    }
  }

  function redo() {
    voice.stop();
    setAnalysis(null);
    setText("");
    setStep("describe");
  }

  const ageNum = Number(age);
  const detailsValid = age !== "" && ageNum >= 0 && ageNum <= 120 && sex !== null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 p-6">
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        {offlineMode || analysis?.offline ? (
          <span className="rounded-full bg-triage-yellow/15 px-3 py-1 font-medium text-triage-yellow">
            Offline mode · Priora Lite on-device model · typing only
          </span>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-3">
          {voice.speaking && (
            <span className="flex items-center gap-1 text-primary">
              <Volume2 className="size-4 animate-pulse" /> Priora is speaking…
            </span>
          )}
          <button type="button" onClick={voice.toggleMute} className="flex items-center gap-1 hover:text-foreground" aria-label={voice.muted ? "Unmute" : "Mute"}>
            {voice.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />} {voice.muted ? "Voice off" : "Voice on"}
          </button>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={offlineMode} onChange={(e) => setOfflineMode(e.target.checked)} />
            Simulate internet outage
          </label>
        </div>
      </div>
      {error && (
        <p className="rounded-lg bg-destructive/10 p-3 text-center text-destructive">{error}</p>
      )}

      {step === "details" && (
        <section className="flex flex-col gap-6">
          <Bilingual ur="خوش آمدید — اپنی معلومات دیں" en="Welcome. Tell us about yourself" />
          <div className="rounded-xl border border-dashed p-4">
            {returning ? (
              <p className="text-center">
                Welcome back{returning.name ? `, ${returning.name}` : ""} ·{" "}
                <span className="font-urdu">دوبارہ خوش آمدید</span>
                <span className="block text-sm text-muted-foreground">
                  {returning.reports} old report(s) on file: your doctor will see them
                </span>
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                <span className="text-sm text-muted-foreground">
                  Been here before? Enter the code under the QR on your old slip ·{" "}
                  <span className="font-urdu">پرانی پرچی کا کوڈ</span>
                </span>
                <div className="flex gap-2">
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="h-12 flex-1 rounded-xl border px-4 text-lg tracking-widest"
                    autoComplete="off"
                  />
                  <Button variant="outline" className="h-12" disabled={code.trim().length < 4} onClick={lookup}>
                    Find me
                  </Button>
                </div>
                {lookupError && <span className="text-sm text-destructive">{lookupError}</span>}
              </div>
            )}
          </div>
          <label className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">Name (optional) · <span className="font-urdu">نام</span></span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-14 rounded-xl border px-4 text-xl"
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">Age · <span className="font-urdu">عمر</span></span>
            <input
              value={age}
              onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 3))}
              inputMode="numeric"
              className="h-14 rounded-xl border px-4 text-2xl tabular-nums"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm text-muted-foreground">
              Where do you live? (optional) · <span className="font-urdu">آپ کا علاقہ</span>
            </span>
            <select value={area} onChange={(e) => setArea(e.target.value)} className="h-14 rounded-xl border bg-background px-4 text-xl">
              <option value="">Prefer not to say</option>
              {AREAS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}, {a.city}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-4">
            {(
              [
                ["male", "مرد", "Male"],
                ["female", "عورت", "Female"],
              ] as const
            ).map(([value, ur, en]) => (
              <button
                key={value}
                type="button"
                onClick={() => setSex(value)}
                className={cn(
                  "flex h-20 flex-col items-center justify-center rounded-xl border-2 text-lg transition",
                  sex === value ? "border-primary bg-primary/10" : "border-border",
                )}
              >
                <span className="font-urdu text-2xl">{ur}</span>
                <span className="text-sm text-muted-foreground">{en}</span>
              </button>
            ))}
          </div>
          <Button
            className="h-16 text-xl"
            disabled={!detailsValid}
            onClick={() => {
              setStep("describe");
              voice.say([voiceUrl("line", "greeting")]);
            }}
          >
            Next · <span className="font-urdu">آگے</span>
          </Button>
        </section>
      )}

      {step === "describe" && (
        <section className="flex flex-col items-center gap-8">
          <Bilingual ur="اپنی تکلیف بتائیں" en="Tell us what's wrong, in your own words" />
          <PainScale value={pain} onChange={setPain} />

          {!typing && !offlineMode ? (
            <>
              <button
                type="button"
                onClick={recorder.recording ? recorder.stop : recorder.start}
                className={cn(
                  "flex size-44 items-center justify-center rounded-full text-white shadow-lg transition",
                  recorder.recording ? "animate-pulse bg-triage-red" : "bg-primary hover:scale-105",
                )}
                aria-label={recorder.recording ? "Stop recording" : "Start recording"}
              >
                {recorder.recording ? <Square className="size-16" /> : <Mic className="size-20" />}
              </button>
              <p className="text-center text-muted-foreground">
                {recorder.recording ? (
                  <>
                    <span className="tabular-nums">0:{String(recorder.seconds).padStart(2, "0")}</span> · Tap
                    to finish · <span className="font-urdu">ختم کرنے کے لیے دبائیں</span>
                  </>
                ) : (
                  <>
                    Tap and speak in Urdu or English · <span className="font-urdu">دبائیں اور بولیں</span>
                  </>
                )}
              </p>
              {recorder.error && <p className="text-center text-destructive">{recorder.error}</p>}
              <Button variant="outline" className="h-12" onClick={() => setTyping(true)}>
                <Keyboard /> Type instead · <span className="font-urdu">لکھ کر بتائیں</span>
              </Button>
            </>
          ) : (
            <div className="flex w-full flex-col gap-4">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                placeholder="e.g. seenay mein dard hai… / سینے میں درد ہے… / chest pain since morning…"
                className="w-full rounded-xl border p-4 text-xl"
                autoFocus
              />
              <div className="flex gap-3">
                <Button variant="outline" className="h-14 flex-1" onClick={() => setTyping(false)}>
                  <Mic /> Speak instead
                </Button>
                <Button
                  className="h-14 flex-1 text-lg"
                  disabled={text.trim().length < 3}
                  onClick={() => analyze({ text })}
                >
                  Continue · <span className="font-urdu">آگے</span>
                </Button>
              </div>
            </div>
          )}
        </section>
      )}

      {(step === "processing" || step === "saving") && (
        <section className="flex flex-col items-center gap-6 py-16">
          <Loader2 className="size-16 animate-spin text-primary" />
          <Bilingual
            ur={step === "processing" ? "ہم آپ کی بات سمجھ رہے ہیں…" : "آپ کا ٹوکن بن رہا ہے…"}
            en={step === "processing" ? "Understanding your symptoms…" : "Creating your token…"}
          />
        </section>
      )}

      {step === "followup" && analysis?.followUp && (
        <section className="flex flex-col items-center gap-6">
          <Bilingual ur="شکریہ۔ صرف ایک سوال اور" en="Thank you. Just one more question" />
          <div className="w-full rounded-2xl border-2 border-primary/40 bg-card p-6 text-center">
            <HelpCircle className="mx-auto mb-3 size-10 text-primary" />
            <p className="font-urdu text-3xl" dir="rtl">{analysis.followUp.question_ur}</p>
            <p className="mt-3 text-lg text-muted-foreground">{analysis.followUp.question_en}</p>
            <button type="button" onClick={voice.replay} className="mt-3 inline-flex items-center gap-1 text-sm text-primary">
              <Volume2 className="size-4" /> Hear again · <span className="font-urdu">دوبارہ سنیں</span>
            </button>
          </div>
          <div className="grid w-full grid-cols-3 gap-3">
            {(
              [
                ["yes", "ہاں", "Yes"],
                ["no", "نہیں", "No"],
                ["unsure", "پتہ نہیں", "Not sure"],
              ] as const
            ).map(([value, ur, en]) => (
              <Button key={value} variant={value === "yes" ? "default" : "outline"} className="h-20 flex-col text-lg" disabled={answering} onClick={() => answerFollowUp(value)}>
                <span className="font-urdu text-2xl leading-tight">{ur}</span>
                <span className="text-sm">{en}</span>
              </Button>
            ))}
          </div>
          {answering && <Loader2 className="animate-spin text-primary" />}
          <p className="text-center text-xs text-muted-foreground">Why we ask: {analysis.followUp.why}</p>
        </section>
      )}

      {step === "confirm" && analysis && (
        <section className="flex flex-col gap-6">
          {analysis.triage.colour === "RED" && (
            <div className="rounded-2xl bg-triage-red p-6 text-center text-white">
              <p className="font-urdu text-3xl" dir="rtl">فوراً ایمرجنسی جائیں</p>
              <p className="text-xl font-semibold">Go to Emergency now. Staff have been alerted.</p>
            </div>
          )}

          {colourBefore && colourBefore !== analysis.triage.colour && (
            <p className="rounded-xl bg-triage-orange/10 p-3 text-center text-triage-orange">
              Updated after your answer: {colourBefore} → <strong>{analysis.triage.colour}</strong>
            </p>
          )}
          <Bilingual ur="ہم نے یہ سمجھا:" en="We understood:" />
          <div className="rounded-2xl border bg-card p-6">
            <p className="font-urdu text-2xl" dir="rtl">{analysis.intake.summary_ur}</p>
            <p className="mt-3 text-muted-foreground">{analysis.intake.summary_en}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {analysis.intake.symptoms.map((s) => (
                <span key={s.name} className="rounded-full bg-muted px-3 py-1 text-sm">
                  {s.name}
                  {s.duration ? ` · ${s.duration}` : ""}
                </span>
              ))}
            </div>
          </div>

          {analysis.intake.clarifying_question && (
            <p className="rounded-xl bg-muted p-4 text-center">
              <span className="font-urdu text-xl" dir="rtl">{analysis.intake.clarifying_question}</span>
              <br />
              <span className="text-sm text-muted-foreground">If so, tap “Redo” and add this detail.</span>
            </p>
          )}

          <div className="flex flex-col items-center gap-2 rounded-2xl border p-4">
            <TriageBadge colour={analysis.triage.colour} size="lg" />
            <p className="text-center text-muted-foreground">
              Next: <strong>triage nurse</strong>, then{" "}
              <strong>{DEPARTMENT_BY_ID[analysis.routing.department].name}</strong> ·{" "}
              <span className="font-urdu">{DEPARTMENT_BY_ID[analysis.routing.department].urdu}</span>
            </p>
            {analysis.knownHistoryUsed > 0 && (
              <p className="text-xs text-muted-foreground">Routing also used your medical history on file</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="h-16 text-lg" onClick={redo}>
              <RotateCcw /> Redo · <span className="font-urdu">دوبارہ</span>
            </Button>
            <Button className="h-16 text-lg" onClick={confirm}>
              <Check /> Correct · <span className="font-urdu">درست ہے</span>
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
