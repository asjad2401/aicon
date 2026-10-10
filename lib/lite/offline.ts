import "server-only";
import modelJson from "@/ml/model/priora-lite.json";
import type { Intake } from "@/lib/ai/intake";
import type { Routing } from "@/lib/routing/route";
import { DEPARTMENT_BY_ID, type DepartmentId } from "@/lib/routing/departments";
import { DISCRIMINATOR_BY_ID, type Colour } from "@/lib/triage/discriminators";
import { triage } from "@/lib/triage/sats";
import { PrioraLite, type LiteModel } from "./model";
import { redFlags } from "./redflags";

/**
 * Offline intake with Priora Lite: our own trained model, no network needed.
 * Used automatically when Gemini is unreachable (or forced for demos).
 * Same safety design: the model only suggests SATS signs; the SATS engine sets the colour;
 * offline results are provisional and borderline cases go to nurse review.
 */

let lite: PrioraLite | null = null;
const getLite = () => (lite ??= new PrioraLite(modelJson as unknown as LiteModel));

const URDU_SCRIPT = /[؀-ۿ]/;

export function runOfflineIntake(text: string, ctx: { age?: number; painScore?: number }) {
  const started = Date.now();
  const pred = getLite().predict(text);
  // Safety lexicon can only add red flags to the model's predictions.
  const flags = redFlags(text).filter((f) => !pred.discriminators.some((d) => d.id === f.id));
  const ids = [...pred.discriminators.map((d) => d.id), ...flags.map((f) => f.id)];
  const uncertain = pred.nearMiss > 0 || pred.departmentConfidence < 0.5;

  const intake: Intake = {
    transcript: text,
    language: URDU_SCRIPT.test(text) ? "urdu" : "mixed",
    chief_complaint: text.length > 60 ? `${text.slice(0, 57)}…` : text,
    summary_en: "Offline triage by Priora Lite (on-device model). Full AI summary unavailable; nurse to confirm.",
    summary_ur: "انٹرنیٹ کے بغیر ابتدائی جانچ۔ نرس تصدیق کرے گی۔",
    symptoms: [],
    discriminators: [
      ...pred.discriminators.map((d) => ({
        id: d.id as Intake["discriminators"][number]["id"],
        evidence: `offline model, ${Math.round(d.probability * 100)}% confidence`,
      })),
      ...flags.map((f) => ({ id: f.id as Intake["discriminators"][number]["id"], evidence: `red-flag phrase: "${f.phrase}"` })),
    ],
    syndromes: [],
    pain_score: ctx.painScore ?? null,
    pregnant: null,
    trauma: null,
    confidence: uncertain ? 0.5 : 0.8,
    clarifying_question: null,
  };

  const result = triage({ discriminatorIds: ids, painScore: ctx.painScore, age: ctx.age, uncertain });

  const dept = pred.department as DepartmentId;
  const reasons = [
    `Offline model: ${DEPARTMENT_BY_ID[dept]?.name ?? dept} (${Math.round(pred.departmentConfidence * 100)}% confidence)`,
    ...pred.discriminators.slice(0, 2).map((d) => `Detected sign: ${DISCRIMINATOR_BY_ID[d.id]?.label ?? d.id}`),
  ];
  const routing: Routing =
    ctx.age != null && ctx.age < 12
      ? { department: "paediatrics", confidence: 1, reasons: ["Patient is under 12"], alternatives: [], source: "rule" }
      : result.colour === ("RED" as Colour)
        ? { department: "emergency", confidence: 1, reasons: ["RED triage → Emergency first", ...reasons], alternatives: [], source: "rule", specialty: dept }
        : pred.departmentConfidence < 0.5
          ? { department: "medical", confidence: pred.departmentConfidence, reasons: ["Offline routing uncertain → Medical OPD, nurse to review", ...reasons], alternatives: [dept], source: "offline_model" }
          : { department: dept, confidence: pred.departmentConfidence, reasons, alternatives: [], source: "offline_model" };

  return { intake, triage: result, routing, model: "priora-lite", ms: Date.now() - started, offline: true as const };
}
