import type { NextRequest } from "next/server";
import { requireStaff } from "@/lib/auth/server";
import { seedDemo } from "@/lib/demo/seed";

// Rebuilds the demo (synthetic data, clusters dated "today"). Admin only. Takes ~30-60 s:
// Ahmed's five sample reports are re-read by the real AI pipeline.
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const { error } = await requireStaff(["admin"]);
  if (error) return error;
  const started = Date.now();
  await seedDemo({
    loadSample: async (name) => {
      const res = await fetch(new URL(`/samples/${name}.jpg`, request.url));
      if (!res.ok) throw new Error(`Sample ${name} not found`);
      return Buffer.from(await res.arrayBuffer());
    },
  });
  return Response.json({ ok: true, seconds: Math.round((Date.now() - started) / 1000) });
}
