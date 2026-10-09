import type { NextRequest } from "next/server";
import { get } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";

// Streams a private document image to staff screens (images are never public).
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/documents/[id]/image">) {
  const { id } = await ctx.params;
  const [doc] = await getDb()
    .select({ imageUrl: schema.documents.imageUrl })
    .from(schema.documents)
    .where(eq(schema.documents.id, Number(id)));
  if (!doc) return new Response("Not found", { status: 404 });

  const blob = await get(doc.imageUrl, { access: "private" });
  if (!blob) return new Response("Not found", { status: 404 });
  return new Response(blob.stream, {
    headers: {
      "Content-Type": blob.blob.contentType ?? "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
