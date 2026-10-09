import "server-only";
import { GoogleGenAI, ThinkingLevel, type ContentListUnion } from "@google/genai";
import { z } from "zod";

/**
 * Single entry point for every Gemini call in Priora.
 *
 * Provider is chosen by AI_PROVIDER:
 *  - "vertex" (default): Vertex AI. Locally uses Application Default Credentials;
 *    on Vercel uses GOOGLE_SERVICE_ACCOUNT_JSON (raw JSON or base64).
 *  - "gemini-api": Gemini Developer API with GEMINI_API_KEY (demo-day fallback).
 */

export { ThinkingLevel };

export const MODELS = {
  fast: process.env.AI_MODEL_FAST ?? "gemini-3.8-flash",
  /** Simple classification calls; supports MINIMAL thinking. */
  fastest: process.env.AI_MODEL_FASTEST ?? "gemini-3.5-flash",
  smart: process.env.AI_MODEL_SMART ?? "gemini-3.1-pro-preview",
  fallback: process.env.AI_MODEL_FALLBACK ?? "gemini-2.5-flash",
} as const;

/** Per-request timeout so a dropped connection falls back instead of hanging. */
const REQUEST_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS ?? 25_000);

let client: GoogleGenAI | null = null;

function parseServiceAccount(raw: string) {
  const json = raw.trim().startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(json);
}

export function getAI(): GoogleGenAI {
  if (client) return client;

  const provider = process.env.AI_PROVIDER ?? "vertex";

  if (provider === "gemini-api") {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    client = new GoogleGenAI({ apiKey, httpOptions: { timeout: REQUEST_TIMEOUT_MS } });
    return client;
  }

  const project = process.env.GOOGLE_CLOUD_PROJECT;
  if (!project) throw new Error("GOOGLE_CLOUD_PROJECT is not set");
  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  client = new GoogleGenAI({
    vertexai: true,
    project,
    location: process.env.GOOGLE_CLOUD_LOCATION ?? "global",
    httpOptions: { timeout: REQUEST_TIMEOUT_MS },
    ...(saJson && {
      googleAuthOptions: {
        credentials: parseServiceAccount(saJson),
        scopes: ["https://www.googleapis.com/auth/cloud-platform"],
      },
    }),
  });
  return client;
}

type GenerateJSONOptions<T extends z.ZodType> = {
  schema: T;
  contents: ContentListUnion;
  system?: string;
  model?: string;
  temperature?: number;
  /** Gemini 3.x only; ignored for older fallback models. */
  thinking?: ThinkingLevel;
};

/**
 * Structured generation: the model is constrained to the Zod schema's JSON Schema,
 * and the response is validated with Zod. Retries once on the fallback model
 * if the primary call fails or returns invalid output.
 */
export async function generateJSON<T extends z.ZodType>({
  schema,
  contents,
  system,
  model = MODELS.fast,
  temperature = 0.2,
  thinking = ThinkingLevel.LOW,
}: GenerateJSONOptions<T>): Promise<{ data: z.infer<T>; model: string }> {
  const ai = getAI();
  const responseJsonSchema = z.toJSONSchema(schema, { target: "openapi-3.0" });
  const attempts = model === MODELS.fallback ? [model] : [model, MODELS.fallback];

  let lastError: unknown;
  for (const m of attempts) {
    try {
      const res = await ai.models.generateContent({
        model: m,
        contents,
        config: {
          systemInstruction: system,
          temperature,
          responseMimeType: "application/json",
          responseJsonSchema,
          ...(m.startsWith("gemini-3") && { thinkingConfig: { thinkingLevel: thinking } }),
        },
      });
      const parsed = schema.safeParse(JSON.parse(res.text ?? ""));
      if (parsed.success) return { data: parsed.data, model: m };
      lastError = parsed.error;
    } catch (err) {
      lastError = err;
    }
    console.warn(`[ai] ${m} failed, ${m === attempts.at(-1) ? "giving up" : "falling back"}:`, String(lastError).slice(0, 300));
  }
  throw new Error(`AI generation failed: ${String(lastError)}`);
}
