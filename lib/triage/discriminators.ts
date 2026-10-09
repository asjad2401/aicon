/**
 * SATS (South African Triage Scale) clinical discriminators, adult chart.
 *
 * This file is clinical configuration, kept separate from logic so it can be
 * reviewed by clinicians. Source: SATS adult triage chart (EMSSA, 2012 edition).
 * Any discriminator present raises the triage colour to at least its level.
 */

export type Colour = "RED" | "ORANGE" | "YELLOW" | "GREEN";

export type Discriminator = {
  id: string;
  level: Exclude<Colour, "GREEN">;
  label: string;
  /** Guidance for the AI extractor: when this discriminator applies. */
  hint: string;
};

export const DISCRIMINATORS: Discriminator[] = [
  // ── Emergency signs → RED ────────────────────────────────────────────────
  { id: "airway_compromised", level: "RED", label: "Airway compromised", hint: "choking, cannot speak, stridor, swelling of throat or tongue blocking breathing" },
  { id: "not_breathing", level: "RED", label: "Not breathing / severe respiratory distress", hint: "stopped breathing, gasping, turning blue, unable to breathe at all" },
  { id: "seizure_current", level: "RED", label: "Seizure – current", hint: "fitting or convulsing right now" },
  { id: "burn_facial_inhalation", level: "RED", label: "Burn – facial / inhalation", hint: "burns to face, singed nose hair, smoke inhalation, hoarse voice after a fire" },
  { id: "hypoglycaemia", level: "RED", label: "Hypoglycaemia (glucose < 3 mmol/L)", hint: "known low blood sugar reading under 3 mmol/L (54 mg/dL), or diabetic who is confused, sweating and shaking" },
  { id: "cardiac_arrest", level: "RED", label: "Cardiac arrest", hint: "collapsed, no pulse, unresponsive and not breathing" },

  // ── Very urgent → ORANGE ─────────────────────────────────────────────────
  { id: "sob_acute", level: "ORANGE", label: "Shortness of breath – acute", hint: "sudden or worsening breathlessness today, cannot complete sentences" },
  { id: "coughing_blood", level: "ORANGE", label: "Coughing blood", hint: "coughing up blood (haemoptysis)" },
  { id: "chest_pain", level: "ORANGE", label: "Chest pain", hint: "any chest pain or pressure, especially spreading to arm, jaw or back, or with sweating" },
  { id: "haemorrhage_uncontrolled", level: "ORANGE", label: "Haemorrhage – uncontrolled", hint: "bleeding that will not stop with pressure" },
  { id: "seizure_post_ictal", level: "ORANGE", label: "Seizure – post-ictal", hint: "had a fit recently and is now drowsy or recovering" },
  { id: "focal_neurology_acute", level: "ORANGE", label: "Focal neurology – acute", hint: "sudden weakness or numbness of face, arm or leg on one side, slurred speech, sudden vision loss (stroke signs)" },
  { id: "reduced_consciousness", level: "ORANGE", label: "Level of consciousness reduced", hint: "very drowsy, confused, hard to wake" },
  { id: "psychosis_aggression", level: "ORANGE", label: "Psychosis / aggression", hint: "violent, threatening self-harm or harm to others, severely agitated or hallucinating" },
  { id: "threatened_limb", level: "ORANGE", label: "Threatened limb", hint: "limb is cold, pale, pulseless or numb, e.g. after injury" },
  { id: "dislocation_large_joint", level: "ORANGE", label: "Dislocation – larger joint", hint: "dislocated shoulder, elbow, hip, knee or ankle (not finger or toe)" },
  { id: "fracture_compound", level: "ORANGE", label: "Fracture – compound", hint: "broken bone with the skin broken or bone visible" },
  { id: "burn_major", level: "ORANGE", label: "Burn – >20% / electrical / circumferential / chemical", hint: "large burns, electrical burns, burns around a whole limb or chest, chemical burns" },
  { id: "poisoning_overdose", level: "ORANGE", label: "Poisoning / overdose", hint: "swallowed poison, pesticide, chemicals or too many tablets" },
  { id: "diabetic_ketosis", level: "ORANGE", label: "Diabetic – glucose > 11 with ketonuria", hint: "diabetic with high sugar and ketones, or vomiting, deep breathing, fruity breath" },
  { id: "vomiting_fresh_blood", level: "ORANGE", label: "Vomiting fresh blood", hint: "vomiting red blood" },
  { id: "pregnancy_abdo", level: "ORANGE", label: "Pregnancy with abdominal pain or trauma", hint: "pregnant and has abdominal pain, or pregnant and had an injury to the abdomen" },
  { id: "pain_severe", level: "ORANGE", label: "Severe pain (8–10/10)", hint: "patient describes pain as unbearable, worst ever, or 8–10 out of 10" },

  // ── Urgent → YELLOW ──────────────────────────────────────────────────────
  { id: "haemorrhage_controlled", level: "YELLOW", label: "Haemorrhage – controlled", hint: "bleeding that has stopped or is controlled with pressure" },
  { id: "dislocation_small_joint", level: "YELLOW", label: "Dislocation – finger or toe", hint: "dislocated finger or toe" },
  { id: "fracture_closed", level: "YELLOW", label: "Fracture – closed", hint: "suspected broken bone without an open wound (deformity, cannot bear weight)" },
  { id: "burn_other", level: "YELLOW", label: "Burn – other", hint: "small burns not covered above" },
  { id: "abdominal_pain", level: "YELLOW", label: "Abdominal pain", hint: "stomach or abdominal pain" },
  { id: "diabetic_hyperglycaemia", level: "YELLOW", label: "Diabetic – glucose > 17, no ketonuria", hint: "diabetic with a very high sugar reading (over 17 mmol/L / 300 mg/dL) but otherwise well" },
  { id: "vomiting_persistent", level: "YELLOW", label: "Vomiting – persistent", hint: "cannot keep anything down, vomiting many times" },
  { id: "pregnancy_trauma", level: "YELLOW", label: "Pregnancy with trauma", hint: "pregnant and had an injury not involving the abdomen" },
  { id: "pain_moderate", level: "YELLOW", label: "Moderate pain (5–7/10)", hint: "patient describes pain as bad but bearable, or 5–7 out of 10" },
];

export const DISCRIMINATOR_IDS = DISCRIMINATORS.map((d) => d.id) as [string, ...string[]];

export const DISCRIMINATOR_BY_ID = Object.fromEntries(
  DISCRIMINATORS.map((d) => [d.id, d]),
) as Record<string, Discriminator>;

/** SATS target time to be seen, in minutes. */
export const TARGET_MINUTES: Record<Colour, number> = {
  RED: 0,
  ORANGE: 10,
  YELLOW: 60,
  GREEN: 240,
};

export const COLOUR_RANK: Record<Colour, number> = { GREEN: 0, YELLOW: 1, ORANGE: 2, RED: 3 };
