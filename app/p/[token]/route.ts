import type { NextRequest } from "next/server";

// Health passport QR target: staff scanning the token-slip QR land on the patient's records.
export async function GET(request: NextRequest, ctx: RouteContext<"/p/[token]">) {
  const { token } = await ctx.params;
  return Response.redirect(new URL(`/records?code=${encodeURIComponent(token)}`, request.url), 307);
}
