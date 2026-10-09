/**
 * Syndromic surveillance configuration: catchment areas and WHO/IDSR-style syndromes.
 * Clinical/public-health configuration, kept separate from logic for review.
 */

export const AREAS = [
  { id: "g-6", name: "G-6", city: "Islamabad" },
  { id: "g-9", name: "G-9", city: "Islamabad" },
  { id: "g-10", name: "G-10", city: "Islamabad" },
  { id: "f-7", name: "F-7", city: "Islamabad" },
  { id: "f-10", name: "F-10", city: "Islamabad" },
  { id: "i-8", name: "I-8", city: "Islamabad" },
  { id: "i-10", name: "I-10", city: "Islamabad" },
  { id: "bhara-kahu", name: "Bhara Kahu", city: "Islamabad" },
  { id: "saddar", name: "Saddar", city: "Rawalpindi" },
  { id: "dhok-hassu", name: "Dhok Hassu", city: "Rawalpindi" },
  { id: "satellite-town", name: "Satellite Town", city: "Rawalpindi" },
  { id: "chaklala", name: "Chaklala", city: "Rawalpindi" },
] as const;

export type AreaId = (typeof AREAS)[number]["id"];
export const AREA_IDS = AREAS.map((a) => a.id) as [AreaId, ...AreaId[]];
export const AREA_BY_ID = Object.fromEntries(AREAS.map((a) => [a.id, a])) as Record<AreaId, (typeof AREAS)[number]>;

export type Syndrome = {
  id: string;
  label: string;
  /** Case definition shown to the AI tagger and to health officers. */
  definition: string;
  concern: string;
  /** Standard response checklist; the AI alert brief may only pick from these. */
  actions: { id: string; text: string }[];
};

export const SYNDROMES: Syndrome[] = [
  {
    id: "dengue_like",
    label: "Dengue-like fever",
    definition: "Acute fever with at least two of: severe headache or pain behind the eyes, muscle/joint/body pain, rash, nausea/vomiting, bleeding signs (gums, nose, skin spots)",
    concern: "Dengue (seasonal peak September–November in Islamabad/Rawalpindi)",
    actions: [
      { id: "notify_dho", text: "Notify the District Health Officer (DHO) and district surveillance unit" },
      { id: "lab_confirm", text: "Request NS1 antigen / IgM testing for suspected cases" },
      { id: "vector_survey", text: "Dispatch a vector-surveillance team for larval survey and fogging in the area" },
      { id: "community_advisory", text: "Community advisory: remove standing water, use repellents and nets" },
      { id: "hospital_alert", text: "Alert hospitals to monitor platelet counts and dengue warning signs" },
    ],
  },
  {
    id: "malaria_like",
    label: "Malaria-like fever",
    definition: "Fever with chills or rigors, often cyclical, with sweating and headache",
    concern: "Malaria",
    actions: [
      { id: "notify_dho", text: "Notify the District Health Officer (DHO)" },
      { id: "lab_confirm", text: "Rapid diagnostic tests / blood smear for suspected cases" },
      { id: "vector_survey", text: "Vector-control assessment in the area" },
    ],
  },
  {
    id: "typhoid_like",
    label: "Typhoid-like (enteric) fever",
    definition: "Fever for 3 or more days with abdominal pain, constipation/diarrhoea, headache or weakness",
    concern: "Typhoid, including extensively drug-resistant (XDR) typhoid",
    actions: [
      { id: "notify_dho", text: "Notify the District Health Officer (DHO)" },
      { id: "lab_confirm", text: "Blood cultures with antibiotic sensitivity (XDR screening)" },
      { id: "water_testing", text: "Test drinking-water sources in the area" },
      { id: "vaccination", text: "Assess need for typhoid conjugate vaccine campaign" },
    ],
  },
  {
    id: "ili",
    label: "Influenza-like illness",
    definition: "Fever with cough or sore throat",
    concern: "Seasonal influenza, COVID-19 and other respiratory viruses",
    actions: [
      { id: "notify_dho", text: "Notify the District Health Officer (DHO)" },
      { id: "lab_confirm", text: "Send respiratory samples for influenza/SARS-CoV-2 testing" },
      { id: "community_advisory", text: "Community advisory: hand hygiene, masks for symptomatic people" },
    ],
  },
  {
    id: "sari",
    label: "Severe acute respiratory infection",
    definition: "Fever and cough with shortness of breath or difficulty breathing",
    concern: "Severe influenza, pneumonia clusters, novel respiratory pathogens",
    actions: [
      { id: "notify_dho", text: "Notify the District Health Officer (DHO) urgently" },
      { id: "lab_confirm", text: "Send respiratory samples for influenza/SARS-CoV-2 testing" },
      { id: "hospital_alert", text: "Alert hospitals: isolation precautions and bed/oxygen readiness" },
    ],
  },
  {
    id: "awd",
    label: "Acute watery diarrhoea",
    definition: "Three or more loose watery stools in 24 hours, with or without vomiting",
    concern: "Cholera and other waterborne outbreaks",
    actions: [
      { id: "notify_dho", text: "Notify the District Health Officer (DHO) urgently" },
      { id: "lab_confirm", text: "Stool samples for cholera rapid test and culture" },
      { id: "water_testing", text: "Test and chlorinate drinking-water sources in the area" },
      { id: "ors_stock", text: "Pre-position ORS and IV fluids at nearby facilities" },
      { id: "community_advisory", text: "Community advisory: boil water, hand washing, food hygiene" },
    ],
  },
  {
    id: "bloody_diarrhoea",
    label: "Bloody diarrhoea",
    definition: "Diarrhoea with visible blood in the stool",
    concern: "Shigellosis / dysentery",
    actions: [
      { id: "notify_dho", text: "Notify the District Health Officer (DHO)" },
      { id: "lab_confirm", text: "Stool culture with sensitivity" },
      { id: "water_testing", text: "Test drinking-water sources in the area" },
    ],
  },
  {
    id: "jaundice",
    label: "Acute jaundice",
    definition: "Yellow eyes or skin of recent onset, often with fever, dark urine or nausea",
    concern: "Hepatitis A/E (waterborne)",
    actions: [
      { id: "notify_dho", text: "Notify the District Health Officer (DHO)" },
      { id: "lab_confirm", text: "Hepatitis A/E serology for suspected cases" },
      { id: "water_testing", text: "Test drinking-water and sewage lines in the area" },
    ],
  },
  {
    id: "measles_like",
    label: "Measles-like rash illness",
    definition: "Fever with a generalised red rash, plus cough, runny nose or red eyes",
    concern: "Measles",
    actions: [
      { id: "notify_dho", text: "Notify the District Health Officer (DHO) urgently" },
      { id: "lab_confirm", text: "Measles IgM serology for suspected cases" },
      { id: "vaccination", text: "Check immunisation coverage and plan catch-up vaccination" },
      { id: "hospital_alert", text: "Alert facilities: isolate suspected cases" },
    ],
  },
];

export const SYNDROME_IDS = SYNDROMES.map((s) => s.id) as [string, ...string[]];
export const SYNDROME_BY_ID = Object.fromEntries(SYNDROMES.map((s) => [s.id, s])) as Record<string, Syndrome>;
