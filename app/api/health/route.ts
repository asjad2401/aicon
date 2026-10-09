import type { NextRequest } from "next/server";
import { z } from "zod";
import { generateJSON, MODELS } from "@/lib/ai/client";

// GET /api/health        → config check (no AI call)
// GET /api/health?ai=1   → also does one tiny structured Gemini call
export async function GET(request: NextRequest) {
  const base = {
    ok: true,
    provider: process.env.AI_PROVIDER ?? "vertex",
    models: MODELS,
  };

  if (request.nextUrl.searchParams.get("ai") !== "1") {
    return Response.json(base);
  }

  try {
    const started = Date.now();
    const { data, model } = await generateJSON({
      schema: z.object({ status: z.literal("ok") }),
      contents: 'Return {"status":"ok"}.',
    });
    return Response.json({ ...base, ai: { ...data, model, ms: Date.now() - started } });
  } catch (err) {
    return Response.json({ ...base, ok: false, error: String(err) }, { status: 502 });
  }
}
