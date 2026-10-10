"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Hover preview (after Le Thanh's 21st.dev component): a bold keyword inside muted text that pops
 * a floating preview of the screen it refers to.
 */
export function HoverPreview({
  children,
  image,
  caption,
  href,
  className,
}: {
  children: React.ReactNode;
  image: string;
  caption?: string;
  href?: string;
  className?: string;
}) {
  const [left, setLeft] = useState<number | null>(null);
  const ref = useRef<HTMLSpanElement>(null);
  /** Centre the card over the keyword, but keep it inside the window. */
  function show() {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const W = Math.min(288, window.innerWidth - 24);
    const centre = r.left + r.width / 2;
    const x = Math.max(12, Math.min(window.innerWidth - W - 12, centre - W / 2));
    setLeft(x - r.left);
  }
  const hide = () => setLeft(null);
  const open = left !== null;
  const label = (
    <span className={cn("font-semibold text-current underline decoration-current/25 decoration-2 underline-offset-[6px] transition hover:decoration-[#e5482d]", className)}>
      {children}
    </span>
  );
  return (
    <span
      ref={ref}
      className="relative inline-block"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {href ? <Link href={href}>{label}</Link> : <span tabIndex={0}>{label}</span>}
      {open && (
        <span className="preview-in pointer-events-none absolute bottom-full z-50 mb-3 block w-72 max-w-[calc(100vw-24px)]" style={{ left: left ?? 0 }} role="tooltip">
          <span className="matte block overflow-hidden p-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="" className="block aspect-[16/10] w-full rounded-[0.6rem] object-cover object-top" />
            {caption && <span className="block px-2 pb-1 pt-2 text-left text-xs font-normal leading-snug text-[#f2f2f2]/70">{caption}</span>}
          </span>
        </span>
      )}
    </span>
  );
}
