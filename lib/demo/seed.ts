/**
 * Resets the database to a realistic demo OPD morning (synthetic data only).
 * - ~14 patients across departments and triage colours, some awaiting the nurse
 * - Ahmed Khan (passport AHMED54K7Q) with 5 old reports digitised by the real AI pipeline,
 *   and no visit yet: in the demo he arrives at the kiosk with chest pain.
 * - 30 days of anonymous background visits across 20 areas and 8 hospitals, with three injected
 *   clusters: dengue-like fever in G-9, measles-like rash in Tarlai, watery diarrhoea in Dhok Hassu.
 * Used by `npm run seed` and the admin "Reset demo" button.
 */
import { sql } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import type { Intake } from "@/lib/ai/intake";
import { addDocument } from "@/lib/records";
import type { DepartmentId } from "@/lib/routing/departments";
import { triage, type Vitals } from "@/lib/triage/sats";
import { hashPassword } from "@/lib/auth/password";
import type { Colour } from "@/lib/triage/discriminators";
import { AREA_BY_ID, AREA_IDS, HOSPITALS, SYNDROME_BY_ID, type AreaId } from "@/lib/surveillance/config";

export type SeedOptions = { loadSample: (name: string) => Promise<Buffer>; log?: (msg: string) => void };

export async function seedDemo(opts: SeedOptions) {
  const log = opts.log ?? (() => {});
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
    area?: string;
    syndromes?: string[];
  };

  const PATIENTS: Seed[] = [
    { token: "E-001", name: "Rashid Mehmood", age: 60, sex: "male", dept: "emergency", minutesAgo: 3, lang: "roman_urdu", said: "saans bilkul nahi aa rahi, honth neelay ho rahe hain", complaint: "Severe breathlessness, blue lips", summary: "Acute severe shortness of breath with cyanosis.", summaryUr: "سانس بالکل نہیں آ رہی، ہونٹ نیلے ہو رہے ہیں", symptoms: ["shortness of breath", "cyanosis"], discriminators: [["not_breathing", "saans bilkul nahi aa rahi"]], vitals: { ...NORMAL, rr: 32, hr: 124, sbp: 96, mobility: "immobile" }, routingReason: "Emergency sign → Emergency" },
    { token: "G-001", name: "Ayesha Bibi", age: 28, sex: "female", dept: "gynae", minutesAgo: 6, lang: "english", said: "I am seven months pregnant and I have strong pain in my stomach", complaint: "Abdominal pain in pregnancy", summary: "28-week pregnant woman with abdominal pain.", summaryUr: "سات ماہ کی حاملہ، پیٹ میں شدید درد", symptoms: ["abdominal pain"], discriminators: [["pregnancy_abdo", "seven months pregnant and I have strong pain in my stomach"]], pregnant: true, vitals: { ...NORMAL, hr: 104 }, routingReason: "Pregnancy-related abdominal pain → Gynae / Obs" },
    { token: "M-001", name: "Fatima Noor", age: 30, sex: "female", dept: "medical", minutesAgo: 95, lang: "urdu", area: "g-9", syndromes: ["dengue_like"], said: "تین دن سے تیز بخار ہے، جسم اور آنکھوں کے پیچھے درد ہے", complaint: "High fever, body and eye pain for 3 days", summary: "High fever with body aches and pain behind the eyes for three days.", summaryUr: "تین دن سے بخار اور جسم میں درد", symptoms: ["fever", "body aches"], vitals: { ...NORMAL, temp: 38.2 }, routingReason: "Acute febrile illness → Medical OPD" },
    { token: "M-002", name: "Bilal Ahmed", age: 45, sex: "male", dept: "medical", minutesAgo: 8, lang: "roman_urdu", said: "subah se ulti mein khoon aa raha hai", complaint: "Vomiting blood since morning", summary: "Haematemesis since the morning.", summaryUr: "صبح سے الٹی میں خون آ رہا ہے", symptoms: ["vomiting blood"], discriminators: [["vomiting_fresh_blood", "ulti mein khoon aa raha hai"]], vitals: { ...NORMAL, hr: 108 }, routingReason: "Upper GI bleed → Medical OPD" },
    { token: "M-003", name: "Saima Khalid", age: 50, sex: "female", dept: "medical", minutesAgo: 42, lang: "urdu", area: "f-10", syndromes: ["ili"], said: "مجھے ایک ہفتے سے کھانسی اور بخار ہے", complaint: "Cough and fever for one week", summary: "Cough for one week, no red flags described.", summaryUr: "ایک ہفتے سے کھانسی", symptoms: ["cough"], routingReason: "Respiratory symptoms → Medical OPD" },
    { token: "M-004", name: "Usman Ghani", age: 68, sex: "male", dept: "medical", minutesAgo: 4, lang: "urdu", said: "مجھے اچانک بولنے میں مشکل ہو رہی ہے اور دائیں بازو میں کمزوری ہے", complaint: "Sudden speech difficulty, right arm weakness", summary: "Acute speech difficulty and right arm weakness, possible stroke.", summaryUr: "اچانک بولنے میں مشکل اور دائیں بازو میں کمزوری", symptoms: ["speech difficulty", "arm weakness"], discriminators: [["focal_neurology_acute", "اچانک بولنے میں مشکل ہو رہی ہے اور دائیں بازو میں کمزوری"]], routingReason: "Acute neurological deficit → Medical OPD" },
    { token: "C-001", name: "Nadia Hussain", age: 31, sex: "female", dept: "cardiology", minutesAgo: 75, lang: "roman_urdu", said: "kabhi kabhi ghabrahat hoti hai aur dil tez dharakne lagta hai", complaint: "Intermittent palpitations", summary: "Episodic palpitations with anxiety.", summaryUr: "کبھی کبھی گھبراہٹ اور دل تیز دھڑکنا", symptoms: ["palpitations", "anxiety"], vitals: NORMAL, routingReason: "Palpitations → Cardiology" },
    { token: "C-002", name: "Tariq Jamil", age: 61, sex: "male", dept: "cardiology", minutesAgo: 38, lang: "english", said: "My chest feels tight when I climb stairs, about 5 out of 10, settles with rest", complaint: "Exertional chest tightness", summary: "Exertional chest tightness 5/10 relieved by rest.", summaryUr: "سیڑھیاں چڑھنے پر سینے میں جکڑن", symptoms: ["chest tightness on exertion"], pain: 5, vitals: NORMAL, routingReason: "Exertional chest symptoms → Cardiology" },
    { token: "O-001", name: "Hamza Raza", age: 22, sex: "male", dept: "orthopaedics", minutesAgo: 27, lang: "english", said: "Fell off my motorbike, my wrist is swollen and looks bent", complaint: "Wrist deformity after fall", summary: "Swollen, deformed wrist after a motorbike fall.", summaryUr: "موٹر سائیکل سے گرا، کلائی سوجی ہوئی اور ٹیڑھی", symptoms: ["wrist swelling", "deformity"], discriminators: [["fracture_closed", "wrist is swollen and looks bent"]], trauma: true, vitals: { ...NORMAL, trauma: true }, routingReason: "Suspected closed fracture → Orthopaedics" },
    { token: "O-002", name: "Parveen Akhtar", age: 58, sex: "female", dept: "orthopaedics", minutesAgo: 118, lang: "english", said: "Knee pain for six months, worse when climbing stairs", complaint: "Chronic knee pain", summary: "Six months of knee pain worse on stairs.", summaryUr: "چھ ماہ سے گھٹنے میں درد", symptoms: ["knee pain"], vitals: NORMAL, routingReason: "Chronic joint pain → Orthopaedics" },
    { token: "D-001", name: "Ali Hassan", age: 22, sex: "male", dept: "dermatology", minutesAgo: 52, lang: "english", said: "Itchy rash on both arms for two weeks", complaint: "Itchy rash on arms", summary: "Two-week itchy rash on both arms.", summaryUr: "دو ہفتے سے بازوؤں پر خارش والے دانے", symptoms: ["rash", "itching"], vitals: NORMAL, routingReason: "Skin rash → Dermatology" },
    { token: "N-001", name: "Zainab Iqbal", age: 19, sex: "female", dept: "ent", minutesAgo: 16, lang: "english", said: "Pain and discharge from my left ear for five days", complaint: "Left ear pain and discharge", summary: "Five days of left ear pain with discharge.", summaryUr: "پانچ دن سے بائیں کان میں درد اور پانی", symptoms: ["ear pain", "ear discharge"], routingReason: "Ear complaint → ENT" },
    { token: "P-001", name: "Musa (child)", age: 3, sex: "male", dept: "paediatrics", minutesAgo: 11, lang: "roman_urdu", area: "dhok-hassu", syndromes: ["awd"], said: "do din se dast aur ultiyan ho rahi hain, kuch khaa pee nahi raha", complaint: "Diarrhoea and vomiting for 2 days", summary: "Three-year-old with two days of diarrhoea and vomiting, poor intake.", summaryUr: "دو دن سے دست اور الٹیاں، کچھ کھا پی نہیں رہا", symptoms: ["diarrhoea", "vomiting"], discriminators: [["vomiting_persistent", "ultiyan ho rahi hain, kuch khaa pee nahi raha"]], routingReason: "Patient is under 12" },
    { token: "Y-001", name: "Imran Shah", age: 27, sex: "male", dept: "eye", minutesAgo: 33, lang: "roman_urdu", said: "do din se aankh laal hai aur paani aa raha hai", complaint: "Red watery eye for 2 days", summary: "Two days of a red, watering eye.", summaryUr: "دو دن سے آنکھ لال اور پانی", symptoms: ["red eye", "watering"], vitals: NORMAL, routingReason: "Eye complaint → Eye" },
  ];

  const AHMED = { passportToken: "AHMED54K7Q", name: "Ahmed Khan", age: 54, sex: "male" };
  const AHMED_DOCS = ["ahmed-2019-discharge", "ahmed-2021-ecg", "ahmed-2022-hba1c", "ahmed-2024-labs", "ahmed-2024-prescription"];

  log("Resetting tables…");
  await db.execute(sql`TRUNCATE audit_log, consultations, summaries, facts, documents, visits, patients, staff RESTART IDENTITY CASCADE`);

  // ── Staff accounts (demo password for all) ─────────────────────────────────
  const DEMO_PASSWORD = "priora2026";
  const STAFF: { username: string; name: string; role: string; department?: string }[] = [
    { username: "admin", name: "Dr. Qureshi (MS)", role: "admin" },
    { username: "nurse.ayesha", name: "Nurse Ayesha", role: "nurse" },
    { username: "dr.emergency", name: "Dr. Hamid", role: "doctor", department: "emergency" },
    { username: "dr.cardio", name: "Dr. Sana", role: "doctor", department: "cardiology" },
    { username: "dr.medical", name: "Dr. Imran", role: "doctor", department: "medical" },
    { username: "dr.surgical", name: "Dr. Asif", role: "doctor", department: "surgical" },
    { username: "dr.ortho", name: "Dr. Nadia", role: "doctor", department: "orthopaedics" },
    { username: "dr.gynae", name: "Dr. Rubina", role: "doctor", department: "gynae" },
    { username: "dr.paeds", name: "Dr. Kamran", role: "doctor", department: "paediatrics" },
    { username: "dr.ent", name: "Dr. Zubair", role: "doctor", department: "ent" },
    { username: "dr.eye", name: "Dr. Mehwish", role: "doctor", department: "eye" },
    { username: "dr.derm", name: "Dr. Hina", role: "doctor", department: "dermatology" },
    { username: "dr.psych", name: "Dr. Faisal", role: "doctor", department: "psychiatry" },
    { username: "dr.dental", name: "Dr. Sara", role: "doctor", department: "dental" },
    { username: "records.bilal", name: "Bilal (Records)", role: "records" },
    { username: "officer.dho", name: "Dr. Farah (DHO)", role: "officer" },
  ];
  const staffRows = await db
    .insert(schema.staff)
    .values(await Promise.all(STAFF.map(async (m) => ({ ...m, department: m.department ?? null, passwordHash: await hashPassword(DEMO_PASSWORD) }))))
    .returning();
  const nurseId = staffRows.find((m) => m.role === "nurse")!.id;
  log(`  ${staffRows.length} staff accounts (password: ${DEMO_PASSWORD})`);

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
      syndromes: p.syndromes ?? [],
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
      nurseColour: final?.colour ?? null,
      triagedBy: final ? nurseId : null,
      colour: (final ?? provisional).colour,
      department: p.dept,
      area: p.area ?? AREA_IDS[PATIENTS.indexOf(p) % AREA_IDS.length],
      hospital: "pims",
      routing: { department: p.dept, confidence: 0.92, reasons: [p.routingReason], alternatives: [], source: p.dept === "paediatrics" ? "rule" : "ai" },
      status: final ? "triaged" : "waiting",
      arrivedAt,
      triagedAt: final ? new Date(arrivedAt.getTime() + 2 * 60_000) : null,
      aiModel: "seed",
      promptVersion: "seed",
    });
    log(`  ${p.token.padEnd(6)} ${(final ?? provisional).colour.padEnd(7)} ${p.dept.padEnd(13)} ${final ? "triaged" : "awaiting nurse"}`);
  }

  // ── 30 days of anonymous background visits for syndromic surveillance ─────────
  log("Generating 30 days of surveillance history…");
  let seed = 7;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  // Where residents go: mostly the nearest hospitals (weight falls off with distance).
  // Outbreak cases spread wider: patients go wherever is nearest or least crowded.
  const km = (aLat: number, aLon: number, bLat: number, bLon: number) =>
    Math.hypot((aLat - bLat) * 111, (aLon - bLon) * 111 * Math.cos((aLat * Math.PI) / 180));
  const pickHospital = (area: string, outbreak = false) => {
    const a = AREA_BY_ID[area as AreaId];
    const scale = outbreak ? 7 : 3.5;
    const weights = HOSPITALS.map((h) => Math.exp(-km(a.lat, a.lon, h.lat, h.lon) / scale) + 0.01);
    let u = rand() * weights.reduce((x, y) => x + y, 0);
    for (let i = 0; i < HOSPITALS.length; i++) {
      if (u < weights[i]) return HOSPITALS[i].id;
      u -= weights[i];
    }
    return HOSPITALS[0].id;
  };
  const poisson = (lambda: number) => {
    let k = 0;
    for (let p = Math.exp(-lambda), sum = p, u = rand(); u > sum; ) sum += p = (p * lambda) / ++k;
    return k;
  };
  // Background daily rate per area (October: dengue season).
  const RATES: Record<string, number> = {
    dengue_like: 0.35, ili: 0.55, typhoid_like: 0.2, awd: 0.25, malaria_like: 0.05,
    jaundice: 0.06, bloody_diarrhoea: 0.05, sari: 0.04, measles_like: 0.02,
  };
  // Injected clusters: extra cases for the last N days (oldest → today).
  const CLUSTERS: { area: string; syndrome: string; extra: number[] }[] = [
    { area: "g-9", syndrome: "dengue_like", extra: [2, 4, 6, 9, 12] },
    { area: "dhok-hassu", syndrome: "awd", extra: [3, 6, 8] },
    { area: "tarlai", syndrome: "measles_like", extra: [1, 2, 3, 5] },
  ];
  const COMPLAINT: Record<string, string[]> = {
    dengue_like: ["High fever with body aches", "Fever, headache and pain behind the eyes", "Fever with joint pain and rash"],
    ili: ["Fever with cough", "Sore throat and fever"],
    typhoid_like: ["Fever for 5 days with abdominal pain", "Persistent fever and weakness"],
    awd: ["Watery diarrhoea and vomiting", "Loose watery stools many times today"],
    malaria_like: ["Fever with chills and sweating"],
    jaundice: ["Yellow eyes and dark urine"],
    bloody_diarrhoea: ["Diarrhoea with blood"],
    sari: ["Fever, cough and difficulty breathing"],
    measles_like: ["Fever with red rash and runny nose"],
  };
  const DEPT: Record<string, DepartmentId> = { awd: "medical", measles_like: "paediatrics", sari: "medical" };

  const pkMidnight = (() => { const d = new Date(now + 5 * 3600_000); d.setUTCHours(0, 0, 0, 0); return d.getTime() - 5 * 3600_000; })();
  const history: { area: string; syndrome: string; at: Date; hospital: string }[] = [];
  for (let daysAgo = 29; daysAgo >= 0; daysAgo--) {
    const dayStart = pkMidnight - daysAgo * 86_400_000;
    const span = daysAgo === 0 ? Math.max(now - dayStart, 60_000) : 14 * 3600_000; // today: only up to now
    const startAt = daysAgo === 0 ? dayStart : dayStart + 8 * 3600_000;
    for (const area of AREA_IDS) {
      for (const [syndrome, rate] of Object.entries(RATES)) {
        const n = poisson(rate);
        for (let i = 0; i < n; i++) history.push({ area, syndrome, at: new Date(startAt + rand() * span), hospital: pickHospital(area) });
        const c = CLUSTERS.find((x) => x.area === area && x.syndrome === syndrome);
        const extra = c && daysAgo < c.extra.length ? c.extra[c.extra.length - 1 - daysAgo] : 0;
        for (let i = 0; i < extra; i++) history.push({ area, syndrome, at: new Date(startAt + rand() * span), hospital: pickHospital(area, true) });
      }
    }
  }
  const ageFor = (syndrome: string) =>
    syndrome === "awd" ? (rand() < 0.4 ? 1 + Math.floor(rand() * 10) : 18 + Math.floor(rand() * 50))
    : syndrome === "measles_like" ? 1 + Math.floor(rand() * 9)
    : 12 + Math.floor(rand() * 55);
  for (let i = 0; i < history.length; i += 400) {
    const chunk = history.slice(i, i + 400);
    const pts = await db
      .insert(schema.patients)
      .values(chunk.map((h, j) => ({ passportToken: `HIST${String(i + j).padStart(6, "0")}`, age: ageFor(h.syndrome), sex: rand() < 0.5 ? "male" : "female" })))
      .returning({ id: schema.patients.id, age: schema.patients.age });
    await db.insert(schema.visits).values(
      chunk.map((h, j) => {
        const complaints = COMPLAINT[h.syndrome];
        const complaint = complaints[Math.floor(rand() * complaints.length)];
        return {
          patientId: pts[j].id,
          tokenNo: "HIST",
          complaintText: complaint,
          language: "english",
          intake: {
            transcript: complaint, language: "english", chief_complaint: complaint, summary_en: complaint, summary_ur: "",
            symptoms: [], discriminators: [], syndromes: [h.syndrome], pain_score: null, pregnant: null, trauma: null,
            confidence: 0.9, clarifying_question: null,
          } satisfies Intake,
          colour: "GREEN",
          department: pts[j].age != null && pts[j].age! < 12 ? "paediatrics" : (DEPT[h.syndrome] ?? "medical"),
          area: h.area,
          hospital: h.hospital,
          status: "seen",
          arrivedAt: h.at,
          aiModel: "seed-history",
          promptVersion: "seed",
        };
      }),
    );
  }
  log(`  ${history.length} background syndrome visits · clusters: ${CLUSTERS.map((c) => `${SYNDROME_BY_ID[c.syndrome].label} in ${c.area}`).join(", ")}`);

  // ── Synthetic pilot records for the clinical validation dashboard ─────────────
  // Clearly tagged (aiModel "seed-pilot"); the dashboard reports how many records are synthetic.
  log("Generating synthetic validation pilot records…");
  const PILOT: Record<Colour, { disc: string[]; dept: DepartmentId; complaints: [string, string][] }> = {
    RED: { disc: ["seizure_current"], dept: "emergency", complaints: [["Severe breathlessness", "Acute severe asthma"], ["Collapsed, unresponsive", "Hypoglycaemia"], ["Fitting at arrival", "Status epilepticus"]] },
    ORANGE: { disc: ["chest_pain"], dept: "cardiology", complaints: [["Chest pain radiating to arm", "Unstable angina"], ["Chest tightness with sweating", "NSTEMI"], ["Palpitations with chest pain", "Paroxysmal SVT"]] },
    YELLOW: { disc: ["abdominal_pain"], dept: "medical", complaints: [["Abdominal pain and vomiting", "Acute gastritis"], ["Fever with abdominal pain", "Enteric fever"], ["Right lower abdominal pain", "Acute appendicitis"]] },
    GREEN: { disc: [], dept: "medical", complaints: [["Cough for a week", "Upper respiratory tract infection"], ["Itchy rash", "Contact dermatitis"], ["Knee pain for months", "Osteoarthritis knee"], ["Burning urine", "Urinary tract infection"]] },
  };
  const RANKED: Colour[] = ["GREEN", "YELLOW", "ORANGE", "RED"];
  const WAIT: Record<Colour, [number, number]> = { RED: [0, 3], ORANGE: [2, 14], YELLOW: [10, 75], GREEN: [30, 210] };
  const pilotMix: Colour[] = [...Array(4).fill("RED"), ...Array(18).fill("ORANGE"), ...Array(38).fill("YELLOW"), ...Array(60).fill("GREEN")];
  for (let i = 0; i < pilotMix.length; i += 60) {
    const chunk = pilotMix.slice(i, i + 60);
    const pts = await db
      .insert(schema.patients)
      .values(chunk.map((_, j) => ({ passportToken: `PILOT${String(i + j).padStart(5, "0")}`, age: 18 + Math.floor(rand() * 60), sex: rand() < 0.5 ? "male" : "female" })))
      .returning({ id: schema.patients.id });
    const visitRows = await db
      .insert(schema.visits)
      .values(
        chunk.map((colour, j) => {
          const cfg = PILOT[colour];
          const [complaint] = cfg.complaints[Math.floor(rand() * cfg.complaints.length)];
          const system = triage({ discriminatorIds: cfg.disc, vitals: NORMAL });
          // Nurse agrees ~86%; otherwise one step away (more often less urgent: SATS rules lean safe).
          const r = rand();
          const k = RANKED.indexOf(system.colour);
          const nurse = r < 0.86 ? system.colour : r < 0.9 ? RANKED[Math.min(3, k + 1)] : RANKED[Math.max(0, k - 1)];
          const arrivedAt = new Date(pkMidnight - (1 + Math.floor(rand() * 14)) * 86_400_000 + (8 + rand() * 6) * 3600_000);
          const [lo, hi] = WAIT[system.colour];
          const calledAt = new Date(arrivedAt.getTime() + (lo + rand() * (hi - lo)) * 60_000);
          return {
            patientId: pts[j].id,
            tokenNo: "PILOT",
            complaintText: complaint,
            language: "english",
            intake: {
              transcript: complaint, language: "english", chief_complaint: complaint, summary_en: complaint, summary_ur: "",
              symptoms: [], discriminators: cfg.disc.map((id) => ({ id, evidence: complaint })), syndromes: [], pain_score: null,
              pregnant: null, trauma: null, confidence: 0.9, clarifying_question: null,
            } as Intake,
            provisionalTriage: system,
            finalTriage: system,
            vitals: NORMAL,
            colour: system.colour,
            nurseColour: nurse,
            triagedBy: nurseId,
            department: cfg.dept,
            hospital: HOSPITALS[Math.floor(rand() * HOSPITALS.length)].id,
            status: "seen",
            arrivedAt,
            triagedAt: new Date(arrivedAt.getTime() + 60_000),
            calledAt,
            seenAt: new Date(calledAt.getTime() + 6 * 60_000),
            aiModel: "seed-pilot",
            promptVersion: "seed",
          };
        }),
      )
      .returning({ id: schema.visits.id, patientId: schema.visits.patientId, colour: schema.visits.colour, complaint: schema.visits.complaintText });
    await db.insert(schema.consultations).values(
      visitRows.map((v) => {
        const cfg = PILOT[v.colour as Colour];
        const dx = cfg.complaints.find(([c]) => c === v.complaint)?.[1] ?? "Assessed";
        const correct = rand() < 0.93;
        const br = rand();
        return {
          visitId: v.id,
          patientId: v.patientId,
          doctorId: staffRows.find((m) => m.department === cfg.dept)?.id ?? null,
          diagnoses: [dx],
          prescriptions: [],
          labOrders: [],
          disposition: v.colour === "RED" ? "admitted" : "discharged",
          departmentCorrect: correct,
          correctDepartment: correct ? null : v.colour === "YELLOW" ? "surgical" : "medical",
          briefRating: br < 0.62 ? "accurate" : br < 0.67 ? "had_error" : "not_used",
          briefIssue: br >= 0.62 && br < 0.67 ? "Listed an old medication the patient has since stopped" : null,
        };
      }),
    );
  }
  log(`  ${pilotMix.length} synthetic pilot triage records with consultations`);

  log("Creating Ahmed Khan and digitising his reports with AI…");
  const [ahmed] = await db.insert(schema.patients).values(AHMED).returning();
  await Promise.all(
    AHMED_DOCS.map(async (name) => {
      const doc = await addDocument(ahmed.id, {
        bytes: await opts.loadSample(name),
        mimeType: "image/jpeg",
        name: `${name}.jpg`,
      });
      log(`  ${name}: ${doc.status} (${doc.docType ?? "?"}, ${doc.docDate ?? "no date"})`);
    }),
  );
  const [{ facts }] = await db.select({ facts: sql<number>`count(*)::int` }).from(schema.facts);
  log(`Done. Ahmed Khan: passport ${AHMED.passportToken}, ${facts} facts on file.`);
}
