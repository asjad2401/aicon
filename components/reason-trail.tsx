import type { Reason } from "@/lib/triage/sats";
import { TRIAGE_META } from "./triage-badge";
import { cn } from "@/lib/utils";

const SOURCE_LABEL: Record<Reason["source"], string> = {
  tews: "Vitals (TEWS)",
  discriminator: "SATS sign",
  safety: "Safety rule",
};

/** Every triage decision shows exactly which rule produced it. */
export function ReasonTrail({ reasons, evidence }: { reasons: Reason[]; evidence?: Record<string, string> }) {
  return (
    <ol className="flex flex-col gap-1.5 text-sm">
      {reasons.map((r, i) => (
        <li key={i} className="flex items-start gap-2">
          <span
            className={cn(
              "mt-1.5 size-2 shrink-0 rounded-full",
              r.colour ? TRIAGE_META[r.colour].bg : "bg-muted-foreground/40",
            )}
          />
          <span>
            <span className="text-muted-foreground">{SOURCE_LABEL[r.source]}:</span> {r.text}
            {evidence?.[r.text] && (
              <span className="block text-xs italic text-muted-foreground">“{evidence[r.text]}”</span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}
