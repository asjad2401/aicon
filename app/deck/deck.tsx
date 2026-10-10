"use client";

import { useCallback, useEffect, useState } from "react";
import { SLIDES } from "./slides";

const W = 1600;
const H = 900;

/** Live pitch deck (under 4 minutes). Keys: → / Space next, ← back, N notes + timer, A autoplay, F fullscreen. */
export function Deck() {
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [notes, setNotes] = useState(false);
  const [auto, setAuto] = useState(false);
  const [scale, setScale] = useState(1);
  const [started, setStarted] = useState<number | null>(null);
  const [now, setNow] = useState(0);

  const slide = SLIDES[Math.min(index, SLIDES.length - 1)];
  const steps = slide.steps ?? 1;

  useEffect(() => {
    const s = Number(new URLSearchParams(window.location.search).get("slide"));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from the URL on mount
    if (s > 0) setIndex(Math.min(s, SLIDES.length) - 1);
  }, []);
  useEffect(() => {
    try {
      window.history.replaceState(null, "", `?slide=${index + 1}`);
    } catch {
      /* file:// or sandboxed */
    }
  }, [index]);

  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / W, window.innerHeight / H));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    if (started === null) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [started]);

  const next = useCallback(() => {
    setStarted((s) => s ?? Date.now());
    if (step < steps - 1) setStep(step + 1);
    else if (index < SLIDES.length - 1) {
      setIndex(index + 1);
      setStep(0);
    } else setAuto(false);
  }, [step, steps, index]);

  const prev = useCallback(() => {
    if (step > 0) setStep(step - 1);
    else if (index > 0) {
      setIndex(index - 1);
      setStep((SLIDES[index - 1].steps ?? 1) - 1);
    }
  }, [step, index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowRight", " ", "PageDown", "Enter"].includes(e.key)) {
        e.preventDefault();
        next();
      } else if (["ArrowLeft", "PageUp", "Backspace"].includes(e.key)) {
        e.preventDefault();
        prev();
      } else if (e.key === "n" || e.key === "N") setNotes((v) => !v);
      else if (e.key === "a" || e.key === "A") setAuto((v) => !v);
      else if (e.key === "Home") {
        setIndex(0);
        setStep(0);
      } else if (e.key === "f" || e.key === "F") {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(next, 3800);
    return () => clearTimeout(t);
  }, [auto, next]);

  // Exposed for the offline PPTX export (scripted capture of every click-state).
  useEffect(() => {
    (window as unknown as { __deck: unknown }).__deck = { slide: slide.id, index, step, steps, total: SLIDES.length, note: slide.notes };
  }, [slide, index, step, steps]);

  const progress = SLIDES.slice(0, index).reduce((n, s) => n + (s.steps ?? 1), 0) + step + 1;
  const total = SLIDES.reduce((n, s) => n + (s.steps ?? 1), 0);
  const elapsed = started === null ? 0 : Math.max(0, Math.floor((now - started) / 1000));
  const clock = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;

  return (
    <main className="fixed inset-0 overflow-hidden bg-black text-[#ededed]" onClick={(e) => (e.clientX > window.innerWidth / 3 ? next() : prev())}>
      <div className="absolute left-1/2 top-1/2" style={{ width: W, height: H, transform: `translate(-50%, -50%) scale(${scale})` }}>
        <div key={slide.id} className="animate-in fade-in zoom-in-95 absolute inset-0 overflow-hidden bg-[#0b0b0b] duration-500">
          {slide.render({ step })}
        </div>
        <div data-chrome className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-white/5">
          <div className="h-full bg-[#e5482d] transition-all duration-500" style={{ width: `${(progress / total) * 100}%` }} />
        </div>
      </div>

      {notes && (
        <div data-chrome className="absolute inset-x-0 bottom-0 max-h-[45vh] overflow-y-auto border-t border-white/10 bg-black/90 p-6 backdrop-blur" onClick={(e) => e.stopPropagation()}>
          <p className="mb-2 flex gap-4 font-mono text-xs uppercase tracking-widest text-white/40">
            <span>
              Slide {index + 1}/{SLIDES.length}
              {steps > 1 ? ` · click ${step + 1}/${steps}` : ""}
            </span>
            <span className={elapsed > 240 ? "text-[#ff6b4a]" : ""}>⏱ {clock} / 4:00</span>
            {auto && <span className="text-[#e5482d]">● auto</span>}
          </p>
          <p className="max-w-5xl whitespace-pre-line text-lg leading-relaxed">{slide.notes}</p>
        </div>
      )}
    </main>
  );
}
