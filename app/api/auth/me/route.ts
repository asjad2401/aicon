import { getSession } from "@/lib/auth/server";

export async function GET() {
  return Response.json({ user: await getSession() });
}
