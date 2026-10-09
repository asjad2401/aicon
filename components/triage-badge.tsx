import { cn } from "@/lib/utils";
import type { Colour } from "@/lib/triage/discriminators";

export const TRIAGE_META: Record<Colour, { label: string; urdu: string; bg: string; text: string; ring: string }> = {
  RED: { label: "Emergency", urdu: "ایمرجنسی", bg: "bg-triage-red", text: "text-triage-red", ring: "ring-triage-red" },
  ORANGE: { label: "Very urgent", urdu: "انتہائی فوری", bg: "bg-triage-orange", text: "text-triage-orange", ring: "ring-triage-orange" },
  YELLOW: { label: "Urgent", urdu: "فوری", bg: "bg-triage-yellow", text: "text-triage-yellow", ring: "ring-triage-yellow" },
  GREEN: { label: "Routine", urdu: "معمول", bg: "bg-triage-green", text: "text-triage-green", ring: "ring-triage-green" },
};

const ICON: Record<Colour, string> = { RED: "▲", ORANGE: "◆", YELLOW: "●", GREEN: "■" };

/** Colour is never the only signal: always shape + label (colourblind-safe). */
export function TriageBadge({
  colour,
  size = "md",
  className,
}: {
  colour: Colour;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const m = TRIAGE_META[colour];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold text-white",
        m.bg,
        size === "sm" && "px-2 py-0.5 text-xs",
        size === "md" && "px-3 py-1 text-sm",
        size === "lg" && "px-5 py-2 text-xl",
        className,
      )}
    >
      <span aria-hidden>{ICON[colour]}</span>
      {colour} · {m.label}
    </span>
  );
}
