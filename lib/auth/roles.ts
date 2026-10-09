/** Staff roles and what each may open. Shared by the proxy, API guards and the UI. */

export const ROLES = ["admin", "nurse", "doctor", "records", "officer"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Medical superintendent (admin)",
  nurse: "Triage nurse",
  doctor: "Doctor",
  records: "Records clerk",
  officer: "District health officer",
};

export type SessionUser = { uid: number; username: string; name: string; role: Role; dept: string | null };

/** Staff pages and the roles allowed on them (first match wins). Public pages are not listed. */
export const PAGE_RULES: { prefix: string; roles: Role[] }[] = [
  { prefix: "/nurse", roles: ["nurse", "admin"] },
  { prefix: "/doctor", roles: ["doctor", "admin"] },
  { prefix: "/records", roles: ["records", "nurse", "doctor", "admin"] },
  { prefix: "/patients", roles: ["doctor", "nurse", "records", "admin"] },
  { prefix: "/surveillance", roles: ["officer", "admin"] },
  { prefix: "/validation", roles: ["admin", "officer", "doctor"] },
  { prefix: "/p/", roles: ["records", "nurse", "doctor", "admin"] },
];

export function pageRule(pathname: string) {
  return PAGE_RULES.find((r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`) || (r.prefix.endsWith("/") && pathname.startsWith(r.prefix)));
}

/** Where each role lands after login. */
export function homeFor(user: Pick<SessionUser, "role" | "dept">) {
  switch (user.role) {
    case "nurse":
      return "/nurse";
    case "doctor":
      return `/doctor/${user.dept ?? "medical"}`;
    case "records":
      return "/records";
    case "officer":
      return "/surveillance";
    default:
      return "/validation";
  }
}

export const NAV: { href: string; label: string; roles: Role[] | "public" }[] = [
  { href: "/kiosk", label: "Kiosk", roles: "public" },
  { href: "/nurse", label: "Nurse", roles: ["nurse", "admin"] },
  { href: "/doctor", label: "Doctor", roles: ["doctor", "admin"] },
  { href: "/records", label: "Records", roles: ["records", "nurse", "doctor", "admin"] },
  { href: "/surveillance", label: "Early warning", roles: ["officer", "admin"] },
  { href: "/validation", label: "Validation", roles: ["admin", "officer", "doctor"] },
  { href: "/impact", label: "Impact", roles: "public" },
  { href: "/eval", label: "Evaluation", roles: "public" },
];
