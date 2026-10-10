import {
  COLOUR_RANK,
  DISCRIMINATOR_BY_ID,
  TARGET_MINUTES,
  type Colour,
} from "./discriminators";

/**
 * Deterministic SATS triage engine (adult).
 *
 * AI never decides the colour. AI extracts findings → this module maps them to
 * a colour with a full reason trail. Final colour = max(TEWS colour, highest
 * discriminator colour). Escalates (never de-escalates) under uncertainty.
 */

export type AVPU = "alert" | "confused" | "voice" | "pain" | "unresponsive";
export type Mobility = "walking" | "with_help" | "immobile";

export type Vitals = {
  rr?: number; // respiratory rate, breaths/min
  hr?: number; // heart rate, beats/min
  sbp?: number; // systolic BP, mmHg
  temp?: number; // °C
  avpu?: AVPU;
  mobility?: Mobility;
  trauma?: boolean;
};

export type Reason = {
  source: "tews" | "discriminator" | "safety";
  text: string;
  points?: number;
  colour?: Colour;
};

export type TriageInput = {
  discriminatorIds: string[];
  vitals?: Vitals;
  painScore?: number; // 0–10, self-reported
  age?: number;
  /** AI extraction flagged low confidence. */
  uncertain?: boolean;
  /** Colours from two independent AI readings that disagreed (the more urgent is already applied). */
  readingsDisagreed?: string[];
  /** Talking-kiosk follow-up: the question asked and the patient's answer. */
  followUp?: { question: string; answer: "yes" | "no" | "unsure" };
};

export type TriageResult = {
  colour: Colour;
  provisional: boolean;
  tews: number | null;
  tewsColour: Colour | null;
  discriminatorColour: Colour | null;
  matched: string[];
  reasons: Reason[];
  targetMinutes: number;
  flags: string[];
};

const VITAL_KEYS = ["rr", "hr", "sbp", "temp", "avpu", "mobility", "trauma"] as const;

type Scored = { points: number; text: string } | null;

function scoreRR(rr?: number): Scored {
  if (rr == null) return null;
  const points = rr < 9 ? 2 : rr <= 14 ? 0 : rr <= 20 ? 1 : rr <= 29 ? 2 : 3;
  return { points, text: `Resp. rate ${rr}/min` };
}

function scoreHR(hr?: number): Scored {
  if (hr == null) return null;
  const points =
    hr < 41 ? 2 : hr <= 50 ? 1 : hr <= 100 ? 0 : hr <= 110 ? 1 : hr <= 129 ? 2 : 3;
  return { points, text: `Heart rate ${hr}/min` };
}

function scoreSBP(sbp?: number): Scored {
  if (sbp == null) return null;
  const points = sbp < 71 ? 3 : sbp <= 80 ? 2 : sbp <= 100 ? 1 : sbp <= 199 ? 0 : 2;
  return { points, text: `Systolic BP ${sbp} mmHg` };
}

function scoreTemp(temp?: number): Scored {
  if (temp == null) return null;
  const points = temp < 35 || temp > 38.4 ? 2 : 0;
  return { points, text: `Temperature ${temp}°C` };
}

const AVPU_POINTS: Record<AVPU, number> = {
  alert: 0,
  confused: 1,
  voice: 1,
  pain: 2,
  unresponsive: 3,
};

const MOBILITY_POINTS: Record<Mobility, number> = { walking: 0, with_help: 1, immobile: 2 };

export function computeTEWS(v: Vitals): {
  score: number;
  complete: boolean;
  reasons: Reason[];
} {
  const parts: Scored[] = [
    scoreRR(v.rr),
    scoreHR(v.hr),
    scoreSBP(v.sbp),
    scoreTemp(v.temp),
    v.avpu ? { points: AVPU_POINTS[v.avpu], text: `AVPU: ${v.avpu}` } : null,
    v.mobility ? { points: MOBILITY_POINTS[v.mobility], text: `Mobility: ${v.mobility.replace("_", " ")}` } : null,
    v.trauma != null ? { points: v.trauma ? 1 : 0, text: v.trauma ? "Trauma: yes" : "Trauma: no" } : null,
  ];
  const scored = parts.filter((p): p is NonNullable<Scored> => p !== null);
  return {
    score: scored.reduce((sum, p) => sum + p.points, 0),
    complete: VITAL_KEYS.every((k) => v[k] != null),
    reasons: scored
      .filter((p) => p.points > 0)
      .map((p) => ({ source: "tews", text: `${p.text} → +${p.points}`, points: p.points })),
  };
}

export function tewsToColour(score: number): Colour {
  if (score >= 7) return "RED";
  if (score >= 5) return "ORANGE";
  if (score >= 3) return "YELLOW";
  return "GREEN";
}

const maxColour = (a: Colour, b: Colour): Colour => (COLOUR_RANK[a] >= COLOUR_RANK[b] ? a : b);

export function triage(input: TriageInput): TriageResult {
  const reasons: Reason[] = [];
  const flags: string[] = [];

  // Discriminators (AI-extracted IDs, plus deterministic pain mapping).
  const ids = new Set(input.discriminatorIds.filter((id) => id in DISCRIMINATOR_BY_ID));
  if (input.painScore != null) {
    if (input.painScore >= 8) ids.add("pain_severe");
    else if (input.painScore >= 5) ids.add("pain_moderate");
  }
  const matched = [...ids].sort(
    (a, b) => COLOUR_RANK[DISCRIMINATOR_BY_ID[b].level] - COLOUR_RANK[DISCRIMINATOR_BY_ID[a].level],
  );
  let discriminatorColour: Colour | null = null;
  for (const id of matched) {
    const d = DISCRIMINATOR_BY_ID[id];
    discriminatorColour = discriminatorColour ? maxColour(discriminatorColour, d.level) : d.level;
    reasons.push({ source: "discriminator", text: `${d.label} → ${d.level}`, colour: d.level });
  }

  // TEWS (adult only).
  const paediatric = input.age != null && input.age < 12;
  let tews: number | null = null;
  let tewsColour: Colour | null = null;
  let provisional = true;

  if (paediatric) {
    flags.push("paediatric_review");
    reasons.push({ source: "safety", text: "Under 12: adult TEWS not applicable, nurse to assess with paediatric chart" });
  } else if (input.vitals) {
    const t = computeTEWS(input.vitals);
    tews = t.score;
    tewsColour = tewsToColour(t.score);
    provisional = !t.complete;
    reasons.unshift(...t.reasons, {
      source: "tews",
      text: `TEWS ${t.score}${t.complete ? "" : " (incomplete vitals)"} → ${tewsColour}`,
      colour: tewsColour,
    });
    if (!t.complete) flags.push("vitals_incomplete");
  } else {
    flags.push("vitals_pending");
  }

  let colour: Colour = maxColour(tewsColour ?? "GREEN", discriminatorColour ?? "GREEN");

  // Safety escalation: uncertainty or missing paediatric scoring never yields GREEN.
  if (colour === "GREEN" && (input.uncertain || paediatric)) {
    colour = "YELLOW";
    reasons.push({
      source: "safety",
      text: input.uncertain
        ? "Low-confidence extraction → escalated to YELLOW for nurse review"
        : "Paediatric patient → minimum YELLOW until assessed",
      colour: "YELLOW",
    });
    flags.push("nurse_review");
  }

  if (input.followUp) {
    const said = { yes: "yes", no: "no", unsure: "not sure" }[input.followUp.answer];
    reasons.push({ source: "safety", text: `Kiosk asked: “${input.followUp.question}” → patient said ${said}` });
    if (input.followUp.answer === "unsure" && !flags.includes("nurse_review")) flags.push("nurse_review");
  }

  if (input.readingsDisagreed && input.readingsDisagreed.length > 1) {
    reasons.push({
      source: "safety",
      text: `Two independent AI readings disagreed (${input.readingsDisagreed.join(" vs ")}): more urgent kept, nurse to review`,
    });
    if (!flags.includes("nurse_review")) flags.push("nurse_review");
  }

  if (reasons.length === 0) {
    reasons.push({ source: "discriminator", text: "No SATS discriminators matched → GREEN", colour: "GREEN" });
  }

  return {
    colour,
    provisional,
    tews,
    tewsColour,
    discriminatorColour,
    matched,
    reasons,
    targetMinutes: TARGET_MINUTES[colour],
    flags,
  };
}
