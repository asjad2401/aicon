/** OPD departments as named in Pakistani government teaching hospitals. */
export const DEPARTMENTS = [
  { id: "emergency", name: "Emergency", urdu: "ایمرجنسی", scope: "Life-threatening or RED-triaged patients" },
  { id: "medical", name: "Medical OPD", urdu: "میڈیکل او پی ڈی", scope: "General medicine: fever, infections, diabetes, hypertension, chronic disease, weakness, GI complaints without surgical signs" },
  { id: "cardiology", name: "Cardiology", urdu: "امراضِ قلب", scope: "Chest pain, palpitations, known heart disease, breathlessness on exertion with cardiac history" },
  { id: "surgical", name: "Surgical OPD", urdu: "سرجیکل او پی ڈی", scope: "Lumps, hernias, abscesses, wounds, acute abdomen, surgical follow-up" },
  { id: "orthopaedics", name: "Orthopaedics", urdu: "ہڈی جوڑ", scope: "Fractures, dislocations, joint and back pain, sports injuries" },
  { id: "gynae", name: "Gynae / Obs", urdu: "گائنی", scope: "Pregnancy, menstrual problems, vaginal bleeding or discharge, female reproductive health" },
  { id: "paediatrics", name: "Paediatrics", urdu: "بچوں کا وارڈ", scope: "Patients under 12 years" },
  { id: "ent", name: "ENT", urdu: "کان ناک گلا", scope: "Ear, nose and throat: ear pain or discharge, hearing loss, sinusitis, tonsillitis, nosebleeds" },
  { id: "eye", name: "Eye", urdu: "آنکھوں کا شعبہ", scope: "Eye pain, redness, vision problems, eye injuries" },
  { id: "dermatology", name: "Dermatology", urdu: "جلد", scope: "Rashes, itching, skin infections, hair and nail problems" },
  { id: "psychiatry", name: "Psychiatry", urdu: "نفسیات", scope: "Low mood, anxiety, sleep problems, psychosis, substance use" },
  { id: "dental", name: "Dental", urdu: "دانتوں کا شعبہ", scope: "Toothache, gum problems, mouth ulcers, dental injuries" },
] as const;

export type DepartmentId = (typeof DEPARTMENTS)[number]["id"];

export const DEPARTMENT_IDS = DEPARTMENTS.map((d) => d.id) as [DepartmentId, ...DepartmentId[]];

export const DEPARTMENT_BY_ID = Object.fromEntries(DEPARTMENTS.map((d) => [d.id, d])) as Record<
  DepartmentId,
  (typeof DEPARTMENTS)[number]
>;
