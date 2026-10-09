/**
 * Resets the database to a realistic demo OPD morning (synthetic data only).
 * - ~14 patients across departments and triage colours, some awaiting the nurse
 * - Ahmed Khan (passport AHMED54K7Q) with 5 old reports digitised by the real AI pipeline,
 *   and no visit yet: in the demo he arrives at the kiosk with chest pain.
 * Usage: npm run seed
 */
import { readFile } from "node:fs/promises";
import { sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { Intake } from "@/lib/ai/intake";
import { addDocument } from "@/lib/records";
import type { DepartmentId } from "@/lib/routing/departments";
import { triage, type Vitals } from "@/lib/triage/sats";

const db = getDb();
const NORMAL: Vitals = { rr: 16, hr: 84, sbp: 124, temp: 37, avpu: "alert", mobility: "walking", trauma: false };

type Seed = {
  token: string;
  name: string;
  age: number;
  sex: "male" | "female";
  dept: DepartmentId;
  minutesAgo: number;
  lang: Intake["language"];
  said: string;
  complaint: string;
  summary: string;
  summaryUr: string;
  symptoms: string[];
  discriminators?: [string, string][]; // [id, evidence]
  pain?: number;
  pregnant?: boolean;
  trauma?: boolean;
  vitals?: Vitals; // present → nurse has triaged
  routingReason: string;
};

const PATIENTS: Seed[] = [
  { token: "E-001", name: "Rashid Mehmood", age: 60, sex: "male", dept: "emergency", minutesAgo: 3, lang: "roman_urdu", said: "saans bilkul nahi aa rahi, honth neelay ho rahe hain", complaint: "Severe breathlessness, blue lips", summary: "Acute severe shortness of breath with cyanosis.", summaryUr: "سانس بالکل نہیں آ رہی، ہونٹ نیلے ہو رہے ہیں", symptoms: ["shortness of breath", "cyanosis"], discriminators: [["not_breathing", "saans bilkul nahi aa rahi"]], vitals: { ...NORMAL, rr: 32, hr: 124, sbp: 96, mobility: "immobile" }, routingReason: "Emergency sign → Emergency" },
  { token: "G-001", name: "Ayesha Bibi", age: 28, sex: "female", dept: "gynae", minutesAgo: 6, lang: "english", said: "I am seven months pregnant and I have strong pain in my stomach", complaint: "Abdominal pain in pregnancy", summary: "28-week pregnant woman with abdominal pain.", summaryUr: "سات ماہ کی حاملہ، پیٹ میں شدید درد", symptoms: ["abdominal pain"], discriminators: [["pregnancy_abdo", "seven months pregnant and I have strong pain in my stomach"]], pregnant: true, vitals: { ...NORMAL, hr: 104 }, routingReason: "Pregnancy-related abdominal pain → Gynae / Obs" },
  { token: "M-001", name: "Fatima Noor", age: 30, sex: "female", dept: "medical", minutesAgo: 95, lang: "urdu", said: "تین دن سے بخار ہے اور جسم میں درد ہے", complaint: "Fever and body aches for 3 days", summary: "Fever with generalised body aches for three days.", summaryUr: "تین دن سے بخار اور جسم میں درد", symptoms: ["fever", "body aches"], vitals: { ...NORMAL, temp: 38.2 }, routingReason: "Acute febrile illness → Medical OPD" },
  { token: "M-002", name: "Bilal Ahmed", age: 45, sex: "male", dept: "medical", minutesAgo: 8, lang: "roman_urdu", said: "subah se ulti mein khoon aa raha hai", complaint: "Vomiting blood since morning", summary: "Haematemesis since the morning.", summaryUr: "صبح سے الٹی میں خون آ رہا ہے", symptoms: ["vomiting blood"], discriminators: [["vomiting_fresh_blood", "ulti mein khoon aa raha hai"]], vitals: { ...NORMAL, hr: 108 }, routingReason: "Upper GI bleed → Medical OPD" },
  { token: "M-003", name: "Saima Khalid", age: 50, sex: "female", dept: "medical", minutesAgo: 42, lang: "urdu", said: "مجھے ایک ہفتے سے کھانسی ہے", complaint: "Cough for one week", summary: "Cough for one week, no red flags described.", summaryUr: "ایک ہفتے سے کھانسی", symptoms: ["cough"], routingReason: "Respiratory symptoms → Medical OPD" },
  { token: "M-004", name: "Usman Ghani", age: 68, sex: "male", dept: "medical", minutesAgo: 4, lang: "urdu", said: "مجھے اچانک بولنے میں مشکل ہو رہی ہے اور دائیں بازو میں کمزوری ہے", complaint: "Sudden speech difficulty, right arm weakness", summary: "Acute speech difficulty and right arm weakness, possible stroke.", summaryUr: "اچانک بولنے میں مشکل اور دائیں بازو میں کمزوری", symptoms: ["speech difficulty", "arm weakness"], discriminators: [["focal_neurology_acute", "اچانک بولنے میں مشکل ہو رہی ہے اور دائیں بازو میں کمزوری"]], routingReason: "Acute neurological deficit → Medical OPD" },
  { token: "C-001", name: "Nadia Hussain", age: 31, sex: "female", dept: "cardiology", minutesAgo: 75, lang: "roman_urdu", said: "kabhi kabhi ghabrahat hoti hai aur dil tez dharakne lagta hai", complaint: "Intermittent palpitations", summary: "Episodic palpitations with anxiety.", summaryUr: "کبھی کبھی گھبراہٹ اور دل تیز دھڑکنا", symptoms: ["palpitations", "anxiety"], vitals: NORMAL, routingReason: "Palpitations → Cardiology" },
  { token: "C-002", name: "Tariq Jamil", age: 61, sex: "male", dept: "cardiology", minutesAgo: 38, lang: "english", said: "My chest feels tight when I climb stairs, about 5 out of 10, settles with rest", complaint: "Exertional chest tightness", summary: "Exertional chest tightness 5/10 relieved by rest.", summaryUr: "سیڑھیاں چڑھنے پر سینے میں جکڑن", symptoms: ["chest tightness on exertion"], pain: 5, vitals: NORMAL, routingReason: "Exertional chest symptoms → Cardiology" },
  { token: "O-001", name: "Hamza Raza", age: 22, sex: "male", dept: "orthopaedics", minutesAgo: 27, lang: "english", said: "Fell off my motorbike, my wrist is swollen and looks bent", complaint: "Wrist deformity after fall", summary: "Swollen, deformed wrist after a motorbike fall.", summaryUr: "موٹر سائیکل سے گرا، کلائی سوجی ہوئی اور ٹیڑھی", symptoms: ["wrist swelling", "deformity"], discriminators: [["fracture_closed", "wrist is swollen and looks bent"]], trauma: true, vitals: { ...NORMAL, trauma: true }, routingReason: "Suspected closed fracture → Orthopaedics" },
  { token: "O-002", name: "Parveen Akhtar", age: 58, sex: "female", dept: "orthopaedics", minutesAgo: 118, lang: "english", said: "Knee pain for six months, worse when climbing stairs", complaint: "Chronic knee pain", summary: "Six months of knee pain worse on stairs.", summaryUr: "چھ ماہ سے گھٹنے میں درد", symptoms: ["knee pain"], vitals: NORMAL, routingReason: "Chronic joint pain → Orthopaedics" },
  { token: "D-001", name: "Ali Hassan", age: 22, sex: "male", dept: "dermatology", minutesAgo: 52, lang: "english", said: "Itchy rash on both arms for two weeks", complaint: "Itchy rash on arms", summary: "Two-week itchy rash on both arms.", summaryUr: "دو ہفتے سے بازوؤں پر خارش والے دانے", symptoms: ["rash", "itching"], vitals: NORMAL, routingReason: "Skin rash → Dermatology" },
  { token: "N-001", name: "Zainab Iqbal", age: 19, sex: "female", dept: "ent", minutesAgo: 16, lang: "english", said: "Pain and discharge from my left ear for five days", complaint: "Left ear pain and discharge", summary: "Five days of left ear pain with discharge.", summaryUr: "پانچ دن سے بائیں کان میں درد اور پانی", symptoms: ["ear pain", "ear discharge"], routingReason: "Ear complaint → ENT" },
  { token: "P-001", name: "Musa (child)", age: 3, sex: "male", dept: "paediatrics", minutesAgo: 11, lang: "roman_urdu", said: "do din se dast aur ultiyan ho rahi hain, kuch khaa pee nahi raha", complaint: "Diarrhoea and vomiting for 2 days", summary: "Three-year-old with two days of diarrhoea and vomiting, poor intake.", summaryUr: "دو دن سے دست اور الٹیاں، کچھ کھا پی نہیں رہا", symptoms: ["diarrhoea", "vomiting"], discriminators: [["vomiting_persistent", "ultiyan ho rahi hain, kuch khaa pee nahi raha"]], routingReason: "Patient is under 12" },
  { token: "Y-001", name: "Imran Shah", age: 27, sex: "male", dept: "eye", minutesAgo: 33, lang: "roman_urdu", said: "do din se aankh laal hai aur paani aa raha hai", complaint: "Red watery eye for 2 days", summary: "Two days of a red, watering eye.", summaryUr: "دو دن سے آنکھ لال اور پانی", symptoms: ["red eye", "watering"], vitals: NORMAL, routingReason: "Eye complaint → Eye" },
];

const AHMED = { passportToken: "AHMED54K7Q", name: "Ahmed Khan", age: 54, sex: "male" };
const AHMED_DOCS = ["ahmed-2019-discharge", "ahmed-2021-ecg", "ahmed-2022-hba1c", "ahmed-2024-labs", "ahmed-2024-prescription"];

console.log("Resetting tables…");
await db.execute(sql`TRUNCATE audit_log, summaries, facts, documents, visits, patients RESTART IDENTITY CASCADE`);

const now = Date.now();
for (const p of PATIENTS) {
  const intake: Intake = {
    transcript: p.said,
    language: p.lang,
    chief_complaint: p.complaint,
    summary_en: p.summary,
    summary_ur: p.summaryUr,
    symptoms: p.symptoms.map((name) => ({ name, duration: null, severity: null, body_site: null })),
    discriminators: (p.discriminators ?? []).map(([id, evidence]) => ({ id, evidence }) as Intake["discriminators"][number]),
    pain_score: p.pain ?? null,
    pregnant: p.pregnant ?? null,
    trauma: p.trauma ?? null,
    confidence: 0.95,
    clarifying_question: null,
  };
  const base = { discriminatorIds: intake.discriminators.map((d) => d.id), painScore: p.pain, age: p.age };
  const provisional = triage(base);
  const final = p.vitals ? triage({ ...base, vitals: p.vitals }) : null;
  const arrivedAt = new Date(now - p.minutesAgo * 60_000);

  const [patient] = await db
    .insert(schema.patients)
    .values({ passportToken: `DEMO${p.token.replace("-", "")}X`, name: p.name, age: p.age, sex: p.sex })
    .returning();
  await db.insert(schema.visits).values({
    patientId: patient.id,
    tokenNo: p.token,
    complaintText: p.said,
    language: p.lang,
    intake,
    provisionalTriage: provisional,
    vitals: p.vitals ?? null,
    finalTriage: final,
    colour: (final ?? provisional).colour,
    department: p.dept,
    routing: { department: p.dept, confidence: 0.92, reasons: [p.routingReason], alternatives: [], source: p.dept === "paediatrics" ? "rule" : "ai" },
    status: final ? "triaged" : "waiting",
    arrivedAt,
    triagedAt: final ? new Date(arrivedAt.getTime() + 2 * 60_000) : null,
    aiModel: "seed",
    promptVersion: "seed",
  });
  console.log(`  ${p.token.padEnd(6)} ${(final ?? provisional).colour.padEnd(7)} ${p.dept.padEnd(13)} ${final ? "triaged" : "awaiting nurse"}`);
}

console.log("Creating Ahmed Khan and digitising his reports with AI…");
const [ahmed] = await db.insert(schema.patients).values(AHMED).returning();
await Promise.all(
  AHMED_DOCS.map(async (name) => {
    const doc = await addDocument(ahmed.id, {
      bytes: await readFile(`public/samples/${name}.jpg`),
      mimeType: "image/jpeg",
      name: `${name}.jpg`,
    });
    console.log(`  ${name}: ${doc.status} (${doc.docType ?? "?"}, ${doc.docDate ?? "no date"})`);
  }),
);
const [{ facts }] = await db.select({ facts: sql<number>`count(*)::int` }).from(schema.facts);
console.log(`Done. Ahmed Khan: passport ${AHMED.passportToken}, ${facts} facts on file.`);
