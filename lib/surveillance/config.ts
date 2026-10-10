/**
 * Syndromic surveillance configuration: catchment areas and WHO/IDSR-style syndromes.
 * Clinical/public-health configuration, kept separate from logic for review.
 */

/** Catchment areas with approximate centre coordinates (schematic, not survey-grade). */
export const AREAS = [
  { id: "f-6", name: "F-6", city: "Islamabad", lat: 33.7275, lon: 73.0757 },
  { id: "f-7", name: "F-7", city: "Islamabad", lat: 33.7215, lon: 73.0563 },
  { id: "f-10", name: "F-10", city: "Islamabad", lat: 33.6955, lon: 73.0138 },
  { id: "e-11", name: "E-11", city: "Islamabad", lat: 33.6995, lon: 72.9769 },
  { id: "g-6", name: "G-6", city: "Islamabad", lat: 33.7172, lon: 73.0868 },
  { id: "g-9", name: "G-9", city: "Islamabad", lat: 33.6936, lon: 73.0349 },
  { id: "g-10", name: "G-10", city: "Islamabad", lat: 33.6797, lon: 73.0156 },
  { id: "g-11", name: "G-11", city: "Islamabad", lat: 33.6685, lon: 72.9957 },
  { id: "g-13", name: "G-13", city: "Islamabad", lat: 33.6455, lon: 72.9612 },
  { id: "i-8", name: "I-8", city: "Islamabad", lat: 33.668, lon: 73.077 },
  { id: "i-10", name: "I-10", city: "Islamabad", lat: 33.6466, lon: 73.0389 },
  { id: "bhara-kahu", name: "Bhara Kahu", city: "Islamabad", lat: 33.7333, lon: 73.1667 },
  { id: "tarlai", name: "Tarlai", city: "Islamabad", lat: 33.6567, lon: 73.1497 },
  { id: "saddar", name: "Saddar", city: "Rawalpindi", lat: 33.5985, lon: 73.048 },
  { id: "raja-bazar", name: "Raja Bazar", city: "Rawalpindi", lat: 33.6155, lon: 73.0587 },
  { id: "dhok-hassu", name: "Dhok Hassu", city: "Rawalpindi", lat: 33.6262, lon: 73.0336 },
  { id: "satellite-town", name: "Satellite Town", city: "Rawalpindi", lat: 33.6347, lon: 73.0655 },
  { id: "westridge", name: "Westridge", city: "Rawalpindi", lat: 33.6012, lon: 73.0198 },
  { id: "chaklala", name: "Chaklala", city: "Rawalpindi", lat: 33.5867, lon: 73.0897 },
  { id: "gulzar-e-quaid", name: "Gulzar-e-Quaid", city: "Rawalpindi", lat: 33.5915, lon: 73.1128 },
] as const;

/** Hospitals in the network: each kiosk belongs to one. Approximate coordinates. */
export const HOSPITALS = [
  { id: "pims", name: "PIMS", full: "Pakistan Institute of Medical Sciences", city: "Islamabad", lat: 33.7046, lon: 73.049 },
  { id: "polyclinic", name: "Polyclinic", full: "Federal Government Polyclinic", city: "Islamabad", lat: 33.713, lon: 73.082 },
  { id: "capital", name: "Capital Hospital", full: "Capital Hospital (CDA)", city: "Islamabad", lat: 33.7232, lon: 73.0792 },
  { id: "fgh", name: "FGH Chak Shahzad", full: "Federal General Hospital, Chak Shahzad", city: "Islamabad", lat: 33.6647, lon: 73.1397 },
  { id: "hfh", name: "Holy Family", full: "Holy Family Hospital", city: "Rawalpindi", lat: 33.6375, lon: 73.0691 },
  { id: "bbh", name: "Benazir Bhutto", full: "Benazir Bhutto Hospital", city: "Rawalpindi", lat: 33.6155, lon: 73.07 },
  { id: "dhq", name: "DHQ Rawalpindi", full: "District Headquarters Hospital, Rawalpindi", city: "Rawalpindi", lat: 33.6098, lon: 73.0634 },
  { id: "ffh", name: "Fauji Foundation", full: "Fauji Foundation Hospital", city: "Rawalpindi", lat: 33.577, lon: 73.087 },
] as const;

export type HospitalId = (typeof HOSPITALS)[number]["id"];
export const HOSPITAL_IDS = HOSPITALS.map((h) => h.id) as [HospitalId, ...HospitalId[]];
export const HOSPITAL_BY_ID = Object.fromEntries(HOSPITALS.map((h) => [h.id, h])) as Record<HospitalId, (typeof HOSPITALS)[number]>;

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
