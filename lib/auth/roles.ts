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

/** Four portals, each with its own audience, look and navigation. */
export type Portal = "showcase" | "hospital" | "district";

export const PORTAL_INFO: Record<Portal, { label: string; tagline: string; subdomain: string | null }> = {
  showcase: { label: "Priora", tagline: "Evidence & demo", subdomain: null },
  hospital: { label: "Priora Hospital", tagline: "Clinical staff", subdomain: "hospital" },
  district: { label: "Priora District", tagline: "District Health Office", subdomain: "district" },
};

export const PORTAL_NAV: Record<Portal, { href: string; label: string; roles: Role[] | "public" }[]> = {
  showcase: [
    { href: "/", label: "Overview", roles: "public" },
    { href: "/impact", label: "Impact", roles: "public" },
    { href: "/eval", label: "Evaluation", roles: "public" },
  ],
  hospital: [
    { href: "/nurse", label: "Triage station", roles: ["nurse", "admin"] },
    { href: "/doctor", label: "Doctor queue", roles: ["doctor", "admin"] },
    { href: "/records", label: "Records desk", roles: ["records", "nurse", "doctor", "admin"] },
    { href: "/validation", label: "Clinical validation", roles: ["admin", "doctor"] },
  ],
  district: [
    { href: "/surveillance", label: "Early-warning map", roles: ["officer", "admin"] },
    { href: "/validation", label: "Clinical validation", roles: ["officer", "admin"] },
  ],
};

/** Which portal a role belongs to (where it lands, and whose header it sees). */
export const portalOf = (role: Role): Portal => (role === "officer" ? "district" : "hospital");
