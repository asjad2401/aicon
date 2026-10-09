import "server-only";
import { cookies } from "next/headers";
import type { Role, SessionUser } from "./roles";
import { decodeSession, SESSION_COOKIE } from "./session";

export async function getSession(): Promise<SessionUser | null> {
  return decodeSession((await cookies()).get(SESSION_COOKIE)?.value);
}

type Guard = { user: SessionUser; error: null } | { user: null; error: Response };

/**
 * Authoritative permission check for staff APIs.
 * `department`: when given, doctors may only act on their own department (admins on any).
 */
export async function requireStaff(roles: Role[], opts: { department?: string | null } = {}): Promise<Guard> {
  const user = await getSession();
  if (!user) return { user: null, error: Response.json({ error: "Please sign in" }, { status: 401 }) };
  if (!roles.includes(user.role)) {
    return { user: null, error: Response.json({ error: "Your role does not have access to this" }, { status: 403 }) };
  }
  if (user.role === "doctor" && opts.department && user.dept !== opts.department) {
    return { user: null, error: Response.json({ error: "This patient is in another department" }, { status: 403 }) };
  }
  return { user, error: null };
}

/** Actor string for the audit log, e.g. "nurse:nurse.ayesha". */
export const actorOf = (user: SessionUser) => `${user.role}:${user.username}`;
