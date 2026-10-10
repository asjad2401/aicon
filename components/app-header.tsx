"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import useSWR from "swr";
import { Building2, LogOut, Radar, Sparkles, UserRound } from "lucide-react";
import { PORTAL_INFO, PORTAL_NAV, ROLE_LABEL, portalOf, type Portal, type SessionUser } from "@/lib/auth/roles";
import { fetcher } from "@/lib/client/api";
import { cn } from "@/lib/utils";

const STYLE: Record<Portal, { bar: string; badge: string; icon: typeof Building2 }> = {
  showcase: { bar: "bg-background", badge: "bg-primary/10 text-primary", icon: Sparkles },
  hospital: { bar: "bg-background", badge: "bg-primary text-primary-foreground", icon: Building2 },
  district: { bar: "bg-[#0f2a2a] text-white", badge: "bg-white/15 text-white", icon: Radar },
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

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    await mutate({ user: null });
    router.push(portal === "showcase" ? "/login" : `/login?portal=${portal}`);
  }

  return (
    <header className={cn("flex flex-wrap items-center gap-x-6 gap-y-2 border-b px-6 py-3", style.bar)}>
      <Link href={portal === "showcase" ? "/" : nav[0]?.href ?? "/"} className="flex items-center gap-2">
        <span className={cn("text-xl font-semibold", dark ? "text-white" : "text-brand")}>Priora</span>
        {portal !== "showcase" && (
          <span className={cn("flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold", style.badge)}>
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
          <button onClick={logout} className={cn("ml-1 rounded-md p-1.5", dark ? "text-white/70 hover:bg-white/10" : "text-muted-foreground hover:bg-muted")} aria-label="Sign out">
            <LogOut className="size-4" />
          </button>
        </div>
      ) : (
        data && (
          <Link href="/login" className={cn("rounded-md border px-3 py-1.5 text-sm", dark ? "border-white/30 hover:bg-white/10" : "hover:bg-muted")}>
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
              "rounded-md px-3 py-1.5",
              dark
                ? active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                : active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {n.label}
          </Link>
        );
      })}
      {portal === "showcase" && (
        <Link href="/kiosk" className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
          Patient kiosk
        </Link>
      )}
    </nav>
  );
}
