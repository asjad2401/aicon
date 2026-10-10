"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import useSWR from "swr";
import { Building2, Loader2, LogOut, Radar, RotateCcw, Sparkles, UserRound } from "lucide-react";
import { PORTAL_INFO, PORTAL_NAV, ROLE_LABEL, portalOf, type Portal, type SessionUser } from "@/lib/auth/roles";
import { fetcher } from "@/lib/client/api";
import { notify } from "@/components/ui/matte-stack";
import { cn } from "@/lib/utils";

const STYLE: Record<Portal, { bar: string; badge: string; icon: typeof Building2 }> = {
  showcase: { bar: "bg-card/85 backdrop-blur", badge: "bg-primary/10 text-primary", icon: Sparkles },
  hospital: { bar: "bg-card/90 backdrop-blur", badge: "bg-primary text-primary-foreground", icon: Building2 },
  district: { bar: "ink-panel text-[#f2f2f2] border-white/10", badge: "bg-signal text-white", icon: Radar },
};

/**
 * Portal header: each audience (showcase, hospital staff, district health office) gets its own
 * identity and only the navigation relevant to it.
 */
export function AppHeader({ title, portal: portalProp = "showcase", children }: { title: string; portal?: Portal | "auto"; children?: React.ReactNode }) {
  const router = useRouter();
  const { data, mutate } = useSWR<{ user: SessionUser | null }>("/api/auth/me", fetcher);
  const user = data?.user ?? null;
  // "auto": shared pages (e.g. clinical validation) take the signed-in user's portal.
  const portal: Portal = portalProp === "auto" ? (user ? portalOf(user.role) : "hospital") : portalProp;
  const info = PORTAL_INFO[portal];
  const style = STYLE[portal];
  const nav = PORTAL_NAV[portal].filter((n) => n.roles === "public" || (user && n.roles.includes(user.role)));
  const dark = portal === "district";

  const [resetting, setResetting] = useState(false);
  /** Admin: rebuild the demo data so queues and outbreak clusters are dated "today". */
  async function resetDemo() {
    if (!confirm("Reset the demo? All patients, visits and consultations are replaced with fresh synthetic data dated today. Takes about a minute.")) return;
    setResetting(true);
    notify({ title: "Resetting demo data…", description: "About a minute: Ahmed's reports are re-read by AI", tone: "info" });
    try {
      const res = await fetch("/api/admin/reset", { method: "POST" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Reset failed");
      notify({ title: "Demo reset", description: "Fresh queues and today's clusters are ready" });
      router.refresh();
    } catch (e) {
      notify({ title: "Reset failed", description: e instanceof Error ? e.message : "Try again", tone: "alert" });
    } finally {
      setResetting(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    await mutate({ user: null });
    router.push(portal === "showcase" ? "/login" : `/login?portal=${portal}`);
  }

  return (
    <header className={cn("sticky top-0 z-[1100] flex flex-wrap items-center gap-x-6 gap-y-2 border-b px-6 py-2.5", style.bar)}>
      <Link href={portal === "showcase" ? "/" : nav[0]?.href ?? "/"} className="flex items-center gap-2">
        <span className={cn("font-display text-2xl font-semibold tracking-tight", dark ? "text-[#f2f2f2]" : "text-brand")}>Priora</span>
        {portal !== "showcase" && (
          <span className={cn("flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider", style.badge)}>
            <style.icon className="size-3.5" /> {info.tagline}
          </span>
        )}
      </Link>
      <span className={cn("text-sm font-medium", dark ? "text-white/70" : "text-muted-foreground")}>{title}</span>
      <div className="flex-1">{children}</div>
      <Suspense fallback={<NavLinks nav={nav} dark={dark} portal={portal} pathname={null} />}>
        <ActiveNav nav={nav} dark={dark} portal={portal} />
      </Suspense>
      {user ? (
        <div className={cn("flex items-center gap-2 border-l pl-4 text-sm", dark && "border-white/20")}>
          <UserRound className={cn("size-4", dark ? "text-white/70" : "text-muted-foreground")} />
          <span className="leading-tight">
            <span className="block font-medium">{user.name}</span>
            <span className={cn("block text-xs", dark ? "text-white/60" : "text-muted-foreground")}>
              {ROLE_LABEL[user.role]}
              {user.dept ? ` · ${user.dept}` : ""}
            </span>
          </span>
          {user.role === "admin" && (
            <button
              onClick={resetDemo}
              disabled={resetting}
              className={cn("ml-1 rounded-md p-1.5 disabled:opacity-50", dark ? "text-white/70 hover:bg-white/10" : "text-muted-foreground hover:bg-muted")}
              aria-label="Reset demo data"
              title="Reset demo data"
            >
              {resetting ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
            </button>
          )}
          <button onClick={logout} className={cn("ml-1 rounded-md p-1.5", dark ? "text-white/70 hover:bg-white/10" : "text-muted-foreground hover:bg-muted")} aria-label="Sign out">
            <LogOut className="size-4" />
          </button>
        </div>
      ) : (
        data && (
          <Link href="/login" className={cn("rounded-full border px-4 py-1.5 text-sm", dark ? "border-white/30 hover:bg-white/10" : "hover:bg-muted")}>
            Staff sign in
          </Link>
        )
      )}
    </header>
  );
}

type NavItem = { href: string; label: string };

/** Reads the current path (must sit inside Suspense on dynamic routes). */
function ActiveNav(props: { nav: NavItem[]; dark: boolean; portal: Portal }) {
  return <NavLinks {...props} pathname={usePathname()} />;
}

function NavLinks({ nav, dark, portal, pathname }: { nav: NavItem[]; dark: boolean; portal: Portal; pathname: string | null }) {
  return (
    <nav className="flex gap-1 text-sm">
      {nav.map((n) => {
        const active = !!pathname && (pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href)));
        return (
          <Link
            key={n.href}
            href={n.href}
            className={cn(
              "rounded-full px-3.5 py-1.5 transition",
              dark
                ? active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                : active ? "bg-primary font-medium text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {n.label}
          </Link>
        );
      })}
      {portal === "showcase" && (
        <Link href="/kiosk" className="rounded-full px-3.5 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
          Patient kiosk
        </Link>
      )}
    </nav>
  );
}
