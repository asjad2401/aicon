"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AlertTriangle, Check, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Matte notification stack (after SLtowl's "stack feedback"): matte charcoal cards, three visible
 * at once, the rest wait in line, each dismissible.
 */
export type Tone = "success" | "alert" | "info";
export type MatteItem = { id: string; title: string; description?: string; tone?: Tone };

const VISIBLE = 3;
const ICON = { success: Check, alert: AlertTriangle, info: Info } as const;

export function MatteCard({ item, onDismiss, onClick, active, className }: { item: MatteItem; onDismiss?: () => void; onClick?: () => void; active?: boolean; className?: string }) {
  const Icon = ICON[item.tone ?? "success"];
  return (
    <div
      role={onClick ? "button" : "status"}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => onClick && (e.key === "Enter" || e.key === " ") && onClick()}
      className={cn(
        "matte matte-in flex w-full items-center gap-3 p-3 text-left transition",
        onClick && "cursor-pointer hover:bg-[#242424]",
        active && "ring-2 ring-[#e5482d] ring-offset-2 ring-offset-background",
        className,
      )}
    >
      <span className={cn("matte-tile flex size-9 shrink-0 items-center justify-center", item.tone === "alert" && "text-[#ff6b4a]")}>
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-sm font-semibold">{item.title}</span>
        {item.description && <span className="line-clamp-2 block text-xs text-[#f2f2f2]/60">{item.description}</span>}
      </span>
      {onDismiss && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="rounded-md p-1.5 text-[#f2f2f2]/60 hover:bg-white/10 hover:text-[#f2f2f2]"
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

/** Inline stack: shows three, queues the rest, dismiss locally. */
export function MatteStack({ items, footer, className }: { items: MatteItem[]; footer?: (shown: number, waiting: number) => React.ReactNode; className?: string }) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const live = items.filter((i) => !dismissed.includes(i.id));
  const shown = live.slice(0, VISIBLE);
  if (!live.length) return null;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {shown.map((i) => (
        <MatteCard key={i.id} item={i} onDismiss={() => setDismissed((d) => [...d, i.id])} />
      ))}
      {footer?.(shown.length, live.length - shown.length)}
    </div>
  );
}

/* ---------- Global toasts: notify() from anywhere ---------- */
let queue: MatteItem[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => (listeners.add(l), () => listeners.delete(l));

export function notify(item: Omit<MatteItem, "id">) {
  queue = [...queue, { ...item, id: `${Date.now()}-${Math.random()}` }];
  emit();
}
function dismiss(id: string) {
  queue = queue.filter((i) => i.id !== id);
  emit();
}

/** Mounted once in the root layout. Visible toasts auto-dismiss after 5 s. */
export function MatteToaster() {
  const items = useSyncExternalStore(subscribe, () => queue, () => queue);
  const shown = items.slice(0, VISIBLE);
  const waiting = items.length - shown.length;
  const ids = shown.map((i) => i.id).join(",");
  useEffect(() => {
    if (!ids) return;
    const timers = ids.split(",").map((id) => setTimeout(() => dismiss(id), 5000));
    return () => timers.forEach(clearTimeout);
  }, [ids]);
  if (!items.length) return null;
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[2000] flex w-[340px] flex-col gap-2" aria-live="polite">
      {shown.map((i) => (
        <div key={i.id} className="pointer-events-auto">
          <MatteCard item={i} onDismiss={() => dismiss(i.id)} />
        </div>
      ))}
      {waiting > 0 && <p className="text-center text-xs text-muted-foreground">+{waiting} waiting</p>}
    </div>
  );
}
