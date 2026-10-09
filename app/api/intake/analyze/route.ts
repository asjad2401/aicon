import { runIntakePipeline } from "@/lib/pipeline";

export const maxDuration = 60;

const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

// POST multipart: text | audio (file), age, sex  →  { intake, triage, routing }
// Nothing is stored here; the patient confirms first, then POST /api/visits.
export async function POST(request: Request) {
  const form = await request.formData();
  const text = (form.get("text") as string | null)?.trim();
  const audio = form.get("audio") as File | null;
  const age = form.get("age") ? Number(form.get("age")) : undefined;
  const sex = (form.get("sex") as string | null) ?? undefined;

  if (!text && !audio) {
    return Response.json({ error: "Provide text or audio" }, { status: 400 });
  }
  if (audio && audio.size > MAX_AUDIO_BYTES) {
    return Response.json({ error: "Recording too long" }, { status: 413 });
  }

  try {
    const input = audio
      ? {
          kind: "audio" as const,
          base64: Buffer.from(await audio.arrayBuffer()).toString("base64"),
          mimeType: audio.type.split(";")[0] || "audio/webm",
        }
      : { kind: "text" as const, text: text! };

    const result = await runIntakePipeline(input, { age, sex });
    return Response.json(result);
  } catch (err) {
    console.error("[intake] failed", err);
    return Response.json({ error: "Could not understand the input. Please try again." }, { status: 502 });
  }
}
