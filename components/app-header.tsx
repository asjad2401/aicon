"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { LogOut, UserRound } from "lucide-react";
import { NAV, ROLE_LABEL, type SessionUser } from "@/lib/auth/roles";
import { fetcher } from "@/lib/client/api";

export function AppHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  const router = useRouter();
  const { data, mutate } = useSWR<{ user: SessionUser | null }>("/api/auth/me", fetcher);
  const user = data?.user ?? null;
  const nav = NAV.filter((n) => n.roles === "public" || (user && n.roles.includes(user.role)));

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    await mutate({ user: null });
    router.push("/login");
  }

  return (
    <header className="flex items-center gap-6 border-b bg-background px-6 py-3">
      <Link href="/" className="text-xl font-semibold text-brand">
        Priora
      </Link>
      <span className="text-sm font-medium text-muted-foreground">{title}</span>
      <div className="flex-1">{children}</div>
      <nav className="flex gap-1 text-sm">
        {nav.map((n) => (
          <Link key={n.href} href={n.href} className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            {n.label}
          </Link>
        ))}
      </nav>
      {user ? (
        <div className="flex items-center gap-2 border-l pl-4 text-sm">
          <UserRound className="size-4 text-muted-foreground" />
          <span className="leading-tight">
            <span className="block font-medium">{user.name}</span>
            <span className="block text-xs text-muted-foreground">
              {ROLE_LABEL[user.role]}
              {user.dept ? ` · ${user.dept}` : ""}
            </span>
          </span>
          <button onClick={logout} className="ml-1 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Sign out">
            <LogOut className="size-4" />
          </button>
        </div>
      ) : (
        data && (
          <Link href="/login" className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
            Staff sign in
          </Link>
        )
      )}
    </header>
  );
}
