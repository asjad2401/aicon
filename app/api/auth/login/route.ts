import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { z } from "zod";
import { getDb, schema } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { homeFor, type Role } from "@/lib/auth/roles";
import { encodeSession, SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/lib/auth/session";

const BodySchema = z.object({ username: z.string().min(1).max(60), password: z.string().min(1).max(200) });

export async function POST(request: Request) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter username and password" }, { status: 400 });

  const db = getDb();
  const [member] = await db.select().from(schema.staff).where(eq(schema.staff.username, parsed.data.username.trim().toLowerCase()));
  const ok = member?.active && (await verifyPassword(parsed.data.password, member.passwordHash));
  if (!member || !ok) {
    await db.insert(schema.auditLog).values({ actor: `anon:${parsed.data.username.slice(0, 40)}`, action: "login_failed" });
    return Response.json({ error: "Wrong username or password" }, { status: 401 });
  }

  const user = { uid: member.id, username: member.username, name: member.name, role: member.role as Role, dept: member.department };
  (await cookies()).set(SESSION_COOKIE, encodeSession(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  await db.insert(schema.auditLog).values({ actor: `${user.role}:${user.username}`, action: "login" });
  return Response.json({ user, home: homeFor(user) });
}
