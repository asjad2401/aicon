import Link from "next/link";

const NAV = [
  { href: "/kiosk", label: "Kiosk" },
  { href: "/nurse", label: "Nurse" },
  { href: "/doctor", label: "Doctor" },
  { href: "/records", label: "Records" },
  { href: "/impact", label: "Impact" },
  { href: "/eval", label: "Evaluation" },
];

export function AppHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <header className="flex items-center gap-6 border-b bg-background px-6 py-3">
      <Link href="/" className="text-xl font-semibold text-brand">
        Priora
      </Link>
      <span className="text-sm font-medium text-muted-foreground">{title}</span>
      <div className="flex-1">{children}</div>
      <nav className="flex gap-1 text-sm">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="rounded-md px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
