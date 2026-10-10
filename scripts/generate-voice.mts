/**
 * Pre-generates the kiosk's spoken Urdu lines with Gemini TTS → public/voice/*.m4a.
 * Instant playback at the kiosk (live TTS takes 5–11 s). Resumable: existing files are skipped.
 * Usage: npx tsx --conditions=react-server --env-file=.env.local --tsconfig tsconfig.json scripts/generate-voice.mts
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { getAI } from "@/lib/ai/client";
import { DEPARTMENT_DIRECTIONS, FOLLOW_UP_QUESTIONS, KIOSK_LINES } from "@/lib/voice/phrases";

const ai = getAI();
const OUT = path.resolve("public/voice");
const tmp = mkdtempSync(path.join(tmpdir(), "priora-voice-"));

function wav(pcm: Buffer, rate = 24000) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8); h.write("fmt ", 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

const jobs = [
  ...Object.entries(FOLLOW_UP_QUESTIONS).map(([k, v]) => ({ file: `q-${k}`, text: v.ur })),
  ...Object.entries(KIOSK_LINES).map(([k, v]) => ({ file: `line-${k}`, text: v.ur })),
  ...Object.entries(DEPARTMENT_DIRECTIONS).map(([k, v]) => ({ file: `dept-${k}`, text: v.ur })),
].filter((j) => !existsSync(path.join(OUT, `${j.file}.m4a`)));
console.log(`${jobs.length} clips to generate`);

async function make(job: { file: string; text: string }) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await ai.models.generateContent({
        model: "gemini-2.5-flash-tts",
        contents: [{ role: "user", parts: [{ text: `Say this in Urdu, warmly, calmly and clearly, like a kind hospital nurse speaking to a worried patient: ${job.text}` }] }],
        config: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } } },
      });
      const data = r.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData?.data;
      if (!data) throw new Error("no audio");
      const w = path.join(tmp, `${job.file}.wav`);
      writeFileSync(w, wav(Buffer.from(data, "base64")));
      execFileSync("afconvert", ["-f", "m4af", "-d", "aac", "-b", "64000", w, path.join(OUT, `${job.file}.m4a`)]);
      console.log("ok", job.file);
      return;
    } catch (err) {
      console.warn(`retry ${job.file}: ${String(err).slice(0, 100)}`);
      await new Promise((r) => setTimeout(r, 3000 * (attempt + 1)));
    }
  }
  console.error("FAILED", job.file);
}

const queue = [...jobs];
await Promise.all(Array.from({ length: 1 }, async () => {
  while (queue.length) await make(queue.shift()!);
}));
console.log("done");
