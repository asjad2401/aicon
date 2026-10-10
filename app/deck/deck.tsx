"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { LENSES, SLIDES, type Lens } from "./slides";

const W = 1600;
const H = 900;

/**
 * Live pitch deck. Keys: → / Space next, ← back, 1 2 3 judge lens, N notes, A autoplay, F fullscreen, ? help.
 * One story; the lens swaps in slides and speaker notes for doctors, AI experts or business judges.
 */
export function Deck() {
  const [lens, setLens] = useState<Lens>("doctor");
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [notes, setNotes] = useState(false);
  const [help, setHelp] = useState(true);
  const [auto, setAuto] = useState(false);
  const [scale, setScale] = useState(1);

  const slides = useMemo(() => SLIDES.filter((s) => !s.lens || s.lens === lens), [lens]);
  const slide = slides[Math.min(index, slides.length - 1)];
  const steps = slide.steps ?? 1;

  // Restore lens/slide from the URL once (shareable: /deck?lens=tech&slide=4).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const l = q.get("lens");
    const s = Number(q.get("slide"));
    /* eslint-disable react-hooks/set-state-in-effect -- one-time sync from the URL on mount */
    if (l === "doctor" || l === "tech" || l === "business") setLens(l);
    if (s > 0) setIndex(s - 1);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);
  useEffect(() => {
    window.history.replaceState(null, "", `?lens=${lens}&slide=${index + 1}`);
  }, [lens, index]);

  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / W, window.innerHeight / H));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const next = useCallback(() => {
    setHelp(false);
    if (step < steps - 1) setStep(step + 1);
    else if (index < slides.length - 1) {
      setIndex(index + 1);
      setStep(0);
    } else setAuto(false);
  }, [step, steps, index, slides.length]);

  const prev = useCallback(() => {
    if (step > 0) setStep(step - 1);
    else if (index > 0) {
      setIndex(index - 1);
      setStep((slides[index - 1].steps ?? 1) - 1);
    }
  }, [step, index, slides]);

  const switchLens = useCallback(
    (l: Lens) => {
      const nextSlides = SLIDES.filter((s) => !s.lens || s.lens === l);
      const keep = nextSlides.findIndex((s) => s.id === slide.id);
      setLens(l);
      setIndex(keep >= 0 ? keep : Math.min(index, nextSlides.length - 1));
      if (keep < 0) setStep(0);
    },
    [slide.id, index],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowRight", " ", "PageDown", "Enter"].includes(e.key)) {
        e.preventDefault();
        next();
      }
      else if (["ArrowLeft", "PageUp", "Backspace"].includes(e.key)) {
        e.preventDefault();
        prev();
      }
      else if (e.key === "1") switchLens("doctor");
      else if (e.key === "2") switchLens("tech");
      else if (e.key === "3") switchLens("business");
      else if (e.key === "n" || e.key === "N") setNotes((v) => !v);
      else if (e.key === "a" || e.key === "A") setAuto((v) => !v);
      else if (e.key === "?") setHelp((v) => !v);
      else if (e.key === "Home") {
        setIndex(0);
        setStep(0);
      }
      else if (e.key === "End") {
        setIndex(slides.length - 1);
        setStep(0);
      }
      else if (e.key === "f" || e.key === "F") {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, switchLens, slides.length]);

  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(next, 3800);
    return () => clearTimeout(t);
  }, [auto, next]);

  const note = slide.notes[lens] ?? slide.notes.all ?? "";
  const progress = slides.slice(0, index).reduce((n, s) => n + (s.steps ?? 1), 0) + step + 1;
  const total = slides.reduce((n, s) => n + (s.steps ?? 1), 0);

  return (
    <main className="fixed inset-0 overflow-hidden bg-black text-[#ededed]" onClick={(e) => e.clientX > window.innerWidth / 3 ? next() : prev()}>
      <div className="absolute left-1/2 top-1/2" style={{ width: W, height: H, transform: `translate(-50%, -50%) scale(${scale})` }}>
        <div key={`${slide.id}-${lens}`} className="animate-in fade-in zoom-in-95 absolute inset-0 overflow-hidden bg-[#0b0b0b] duration-500">
          {slide.render({ step, lens })}
        </div>
        {/* Chrome: progress + lens */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-white/5">
          <div className="h-full bg-[#e5482d] transition-all duration-500" style={{ width: `${(progress / total) * 100}%` }} />
        </div>
        <div className="absolute bottom-5 right-8 flex items-center gap-3 font-mono text-[13px] text-white/40">
          {LENSES.map((l, i) => (
            <button
              key={l.id}
              onClick={(e) => {
                e.stopPropagation();
                switchLens(l.id);
              }}
              className={cn("rounded-full px-3 py-1 transition", l.id === lens ? "bg-white text-black" : "hover:text-white")}
            >
              {i + 1} · {l.label}
            </button>
          ))}
          <span className="ml-2 tabular-nums">
            {index + 1}/{slides.length}
          </span>
          {auto && <span className="text-[#e5482d]">● AUTO</span>}
        </div>
      </div>

      {notes && (
        <div className="absolute inset-x-0 bottom-0 max-h-[40vh] overflow-y-auto border-t border-white/10 bg-black/90 p-6 backdrop-blur" onClick={(e) => e.stopPropagation()}>
          <p className="mb-2 font-mono text-xs uppercase tracking-widest text-white/40">
            Speaker notes · {LENSES.find((l) => l.id === lens)?.label} · slide {index + 1}
          </p>
          <p className="max-w-5xl whitespace-pre-line text-lg leading-relaxed">{note}</p>
        </div>
      )}

      {help && (
        <div className="absolute left-1/2 top-6 -translate-x-1/2 rounded-full border border-white/10 bg-[#1f1f1f] px-5 py-2 font-mono text-xs text-white/60" onClick={(e) => e.stopPropagation()}>
          → next · ← back · 1 Doctors · 2 AI experts · 3 Business · N notes · A autoplay · F fullscreen · ? help
        </div>
      )}
    </main>
  );
}
