# Priora

### Priora sees outbreaks a week before the lab reports do.

**An AI triage nurse at every hospital front desk, speaking Urdu, and every conversation becomes an anonymous signal in a district early-warning network.** Patients are understood, prioritised and sent to the right place; the district sees dengue, cholera or measles clusters forming days before lab-confirmed reporting.

[**Try it live → priora.asjad.dev**](https://priora.asjad.dev) · Demo video: _link to be added_

| Outbreak warning | Outbreaks caught within 2 weeks | Missed emergencies | Critical patients wait |
|:---:|:---:|:---:|:---:|
| **7 days earlier** than lab-confirmed reporting | **86% vs 41%** today | **0%** on 110 hard cases | **1h 5m → 1 min** |

| 110 hard test cases | Real Urdu speech | Works offline | Problem scale |
|:---:|:---:|:---:|:---:|
| **0%** under-triage with two-reading safety check | **30 / 30** voice clips triaged correctly | **Our own trained model**, 8 ms on a CPU | PIMS Islamabad: **8,000+ patients a day** in a hospital built for 2,000–3,000 |

<sub>Wait, redirect and file-reading figures come from our OPD simulator; accuracy figures from our evaluations; problem figures are sourced below.</sub>

> AICON'26 · Build With AI · **Health Operations** · Built solo at SEECS, NUST, 9–10 October 2026

---

## 8:40 AM, a government OPD in Rawalpindi

Ahmed, 54, has chest pain spreading to his left arm. He doesn't know which department to go to, so he joins the longest line: the same line as a student with a skin rash and a man who needs a repeat prescription. In his hand is a plastic bag of reports collected over six years.

Seventy minutes later he reaches a doctor who has three minutes for him. The bag goes unread. Nobody sees the 2021 ECG that already showed signs of heart strain.

**This happens every day, in every crowded OPD.**

| The scale | Source |
|---|---|
| **8,000+ patients a day** at PIMS Islamabad, built for 2,000–3,000 outpatients | Health Ministry reply to the Senate, via [The News, Jun 2026](https://www.thenews.pk/print/1421973-the-system-is-unwell) |
| **329,000+ OPD and 254,000+ emergency visits** in a year at Holy Family Hospital Rawalpindi, with no recruitment since 2015 | [Dawn, Jan 2025](https://www.dawn.com/news/1884777) |
| **~1.8 minutes**: the average primary-care consultation in Pakistan | [Irving et al., BMJ Open 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5695512/) (2016 data) |
| **77%** of chronic-disease patients at a Rawalpindi tertiary hospital came directly; only 19% were referred | [Khan et al., PAFMJ 2022](https://pafmj.org/PAFMJ/article/view/8238) |
| Health information systems **"completely absent"** at all care levels in Rawalpindi/Islamabad; records mostly manual | [PLoS One 2021](https://pmc.ncbi.nlm.nih.gov/articles/PMC8496784) |
| **31.4%** of adults have diabetes, the highest prevalence in the world | [IDF Diabetes Atlas 2024](https://diabetesatlas.org/data-by-location/country/pakistan/) |
| National disease surveillance received **75%** of expected weekly reports, yet still logged **75,129** suspected diarrhoea cases in one week | [NIH Pakistan IDSR bulletin, Week 44-2025](https://www2.nih.org.pk/wp-content/uploads/2025/11/Weekly_Report-44-2025.pdf) |
| Sindh **officially** reported **819** dengue cases in 2025, while hospitals and labs counted **12,000+** in six weeks | [Dawn, Oct 2025](https://www.dawn.com/news/amp/1949810) |
| **1 in 3** people aged 10+ cannot read; rural female literacy is **44%** | [Pakistan Economic Survey 2025-26](https://www.finance.gov.pk/survey/chapter_26/11_Health_and_Nutrition.pdf) |

Three problems compound before a doctor ever sees the patient:

- 🚪 **The wrong door.** Patients don't know which OPD treats their symptoms. They queue, get redirected, and queue again.
- 🧍‍♂️🧍‍♀️ **Flat queues.** First come, first served. A heart attack waits behind a rash.
- 🗂️ **A bag of files.** Years of history on paper that nobody has time to read, so the old ECG, the drug allergy and the rising blood sugar get missed.

_Problem identified, and the solution reviewed, with a medical student who works in government hospitals. Her verdict: severity-based routing is the core value, SATS is the triage scale actually in use, and a history brief helps, with a proper examination always following. Priora is built around exactly that._

---

## Two levels, one system

| | For the patient (every front desk) | For the district (every hospital, pooled) |
|---|---|---|
| **What happens** | Speak in Urdu → understood → one smart follow-up question, aloud → SATS colour → right department → cited history brief for the doctor | Every intake is tagged with WHO-style syndromes and pooled anonymously across hospitals → daily aberration check → alert, AI brief, surge plan |
| **Who acts** | Nurse confirms, doctor treats | District health officer investigates and pre-positions resources |
| **What's different** | No forms, no reading, works offline with our own model | Sees clusters days before lab confirmation, across hospitals that today don't share data |

### The district early-warning network
- **12 areas, 4 hospitals** (PIMS, Polyclinic, Holy Family, Benazir Bhutto) on one live map. Each alert shows which hospitals saw the cases: in the demo, the busiest single hospital saw only 36–50% of a cluster.
- **Detection:** a CDC EARS-style aberration check on daily syndrome counts per area (deterministic, explainable).
- **For each alert:** a cited AI brief for the health officer (actions only from a standard response checklist), a **3-day surge projection** and what to stock: beds (using the sourced 13.3% dengue admission rate from Rawalpindi's teaching hospitals, 2025), NS1 kits, ORS.
- **Lead-time study** ([/impact](https://priora.asjad.dev/impact)): across 1,000 simulated outbreaks, Priora alerts a **median 7 days earlier** than lab-confirmed weekly reporting (middle half: 2–11 days), catches **86% vs 41%** within two weeks, with about one false alarm every three months across the district. It needs real coverage: below ~40% of care-seeking patients passing a Priora kiosk, today's system wins, which is why the pilot targets the district's largest OPDs. Only the 75% report-compliance figure is sourced; the rest are stated, adjustable assumptions.

## Meet Priora

Priora is **the front door of the OPD**. Every patient is understood, prioritised and sent to the right place *before* they queue, and the doctor meets them already knowing their history.

With Priora, Ahmed's morning goes like this:

1. 🎙️ **He speaks.** The kiosk greets him in Urdu. He says *"seenay mein thori si bechaini hai"* ("some unease in my chest"). Priora understands him, and because he's been here before, it also knows his history.
2. 🗣️ **It asks the one question that matters, out loud.** *"کیا سینے میں درد یا دباؤ ہے، جو بازو یا جبڑے تک جاتا ہے؟"* ("Is there chest pain or pressure, going to the arm or jaw?") He taps **ہاں** (yes).
3. 🟠 **He's prioritised.** Chest pain is very urgent: ORANGE, sent to Cardiology. The kiosk tells him where to go, in Urdu, and prints a token with a QR health passport.
4. 🔴 **The nurse confirms it.** His heart rate is 130. The triage score jumps to RED, and he goes straight to Emergency, ahead of everyone who can safely wait.
5. 📋 **The doctor is ready.** In seconds, five old reports become a one-page brief: *the 2021 ECG showed ischaemia, HbA1c rose from 7.1% to 8.4%, he's allergic to penicillin, and an echocardiogram was advised twice but never done.* Every line links to the original paper.
6. 📝 **Nothing is lost again.** The consultation is recorded, and next time his history is already there.

---

## What Priora does for each person

| | Before | With Priora |
|---|---|---|
| 🧑 **Patient** | Guesses the department, waits in the wrong line, carries a bag of files | Speaks in their own language, is told where to go, carries a QR instead of paper |
| 👩‍⚕️ **Triage nurse** | Sorts a crowd by eye | Sees who needs her first; enters vitals and gets an explained triage colour |
| 🩺 **Doctor** | Three minutes, a stack of illegible paper | A severity-sorted queue and a cited one-page brief focused on today's complaint |
| 🗃️ **Records clerk** | Photocopies and files | Photographs old reports; AI turns them into searchable history in seconds |
| 🏥 **Medical superintendent** | No visibility on waits or safety | Live queues, an audit trail, and a built-in clinical validation dashboard |
| 🛰️ **District health officer** | Hears about outbreaks after lab confirmation, days later | Early-warning alerts from symptom patterns across the district: dengue, cholera, measles and more |

---

## What Priora does

### 1. Understands every patient, in their own language, and talks back
Patients speak or type in **Urdu, Roman Urdu or English**: no forms, no reading required. AI turns what they say into structured clinical findings, quoting their own words as evidence. Then Priora thinks about **what it still doesn't know**: if one unmentioned danger sign could change the patient's priority, it **asks that single question out loud in Urdu** and re-triages on the answer. If nothing could change the outcome, it doesn't ask. Like a good triage nurse.

### 2. Puts the sickest first, safely
Priora uses the **South African Triage Scale (SATS)**, the protocol designed for busy, low-resource hospitals and already in use locally. **The AI never decides severity**: it extracts findings, fixed SATS rules assign the colour, and a nurse confirms it. Every decision shows exactly why: *"Heart rate 130 → +3 · TEWS 7 → RED"*.

### 3. Sends patients to the right door
Findings, age, pregnancy and **known medical history** route each patient to the right OPD department. Unsure? It defaults to Medical OPD and flags the case for review instead of guessing.

### 4. Turns a bag of files into a one-page brief
Photograph old lab reports, prescriptions (even handwritten ones), ECGs and discharge slips. AI reads them and writes a brief **focused on today's complaint**. Every line is **cited**: one click shows the exact spot on the original paper. Lines without a valid source are removed automatically.

### 5. Keeps a complete record
Doctors record notes, diagnoses, prescriptions, lab orders and the outcome in one form. Every visit builds a patient timeline that follows them through their **QR health passport**, so the next doctor starts with the full picture.

### 6. Keeps working when the internet doesn't
Hospital internet drops. When the cloud AI is unreachable, Priora switches to **Priora Lite**, a triage model **we trained ourselves**: Gemini generated 5,000+ labelled complaints in three languages, and we distilled them into a compact model that runs **with no network in ~8 ms on a CPU**. A hand-curated red-flag phrase list rides alongside and can only add urgency. Offline results are marked provisional and always confirmed by the nurse.

### 7. Warns the district before an outbreak spreads
Every intake is also an anonymous surveillance report. Priora tags symptoms against WHO-style syndrome definitions, compares each area against its own baseline, and raises an alert when something is unusual: *"Dengue-like fever in G-9: 12 cases today against about 1 a day."* The district health officer gets a brief with the evidence and a response checklist **before** lab confirmation arrives.

---

## Built to be trusted

Health care can't run on a black box. Priora is designed so that every decision can be checked.

- ✅ **Rules decide, AI assists.** Severity comes from a validated clinical scale, not a language model.
- 🔁 **Two readings, not one.** Every complaint is read twice by the AI, in parallel. If the readings disagree, the more urgent one wins and the nurse is told.
- 👩‍⚕️ **People stay in charge.** Nurses confirm every colour; overrides need a reason and are logged.
- 🔍 **Everything is explained or cited.** Triage shows its reasoning; every brief line and outbreak claim links to its source.
- 🛡️ **Escalates when in doubt.** An unclear description or a child is never marked as routine without review.
- 🔐 **Staff-only access by role.** Nurses, doctors (only their own department), records clerks, health officers and administrators each see only what they need. Every action is in the audit log.
- 🔒 **Private by design.** Report photos are stored privately and only shown to signed-in staff. Surveillance uses anonymous counts. AI runs on Google Cloud Vertex AI, where prompts are not used to train models.

---

## The difference it makes

We didn't want to just claim impact, so we built a **simulator** ([try it](https://priora.asjad.dev/impact)). The same 300 synthetic patients go through one busy morning twice: once through today's single line, once through Priora. Only the process changes.

| One OPD morning · 300 patients · 4 doctors | Today | With Priora |
|---|:---:|:---:|
| Median wait for RED (critical) patients | 1h 5m | **1 min** |
| ORANGE patients seen within 10 minutes | 14% | **100%** |
| YELLOW patients seen within an hour | 40% | **100%** |
| Patients redirected from the wrong line | 48 | **10** |
| Doctor time spent reading paper files | 5.7 h | **1.9 h** |
| Last patient seen (minutes after opening) | 420 | **343** |

**The honest trade-off:** routine GREEN patients wait a little longer (median 68 → 97 minutes), because emergencies now go first. All of them are still seen within the SATS 4-hour target, and a fairness rule moves anyone who passes it up the queue. Every assumption is a slider you can change.

---

## Proven, not promised

**Tested before trusted** ([all results](https://priora.asjad.dev/eval)).

**1. Standard set:** 28 patient descriptions in English, Roman Urdu and Urdu script, through the real system:

| Triage accuracy | Missed emergencies (under-triage) | Right department | Response time |
|:---:|:---:|:---:|:---:|
| **100%** | **0%** | **96.4%** exact · 100% acceptable | **~6 seconds** |

**2. Stress test:** 110 deliberately hard cases (hidden red flags in mild wording, negations, one-word complaints, typos and code-switching, relatives speaking, children, pregnancy), plus 30 of them as **real synthesised speech**:

| System | Accuracy | Under-triage |
|---|:---:|:---:|
| Gemini, single reading | 93.6% | 0.9% (1 case) |
| **Gemini, two readings (what ships)** | **92.7%** | **0%** |
| Voice: real Urdu / English speech | **100%** (30/30) | **0%** |
| Priora Lite (offline safety net) | 68.2% | 12.7% |

The two-reading check caught the only miss: an electrical burn described as *"he seems fine now"*. Our offline model is honestly weaker on hard cases, which is exactly why it is only a safety net and the nurse confirms every offline result.

**3. Syndrome tagging** (the AI feeding the early-warning network): 44 hand-written complaints including deliberate look-alikes. **Precision 93%, recall 87%, and 16/16 look-alikes correctly left untagged.** The measured recall is what the lead-time study uses. Dengue-like recall was lower on a small sample (3/5); even at 60% recall the study still shows a 5-day lead.

**Validated as it's used.** Priora has a clinical validation study built into the daily workflow:
- Nurses record their own triage colour **before** the system's result is revealed, so there's no anchoring.
- Doctors confirm whether the department was right and whether the brief was accurate, at every consultation.
- A live **validation dashboard** reports nurse-versus-system agreement (Cohen's kappa), under-triage against the nurse, routing accuracy, brief accuracy and real waiting times against SATS targets.

_For the demo, the dashboard is pre-filled with clearly labelled synthetic pilot records; new triages and consultations add real entries live. The 28-case test set is small and written by us. A hospital pilot is the next step, and Priora is already built to run one._

---

## Made for Pakistan

- 🗣️ **Urdu-first and voice-first**, for patients who can't read or write
- 🏥 **Real government OPD departments**, from Medical and Surgical to Gynae/Obs, Paediatrics and Eye
- 🦟 **Local disease patterns**: dengue season, XDR typhoid and waterborne diarrhoea are all on the early-warning watchlist
- 🖨️ **Runs on what hospitals already have**: a tablet or old laptop for the kiosk, a printer for token slips, and a browser for staff. No new hardware.

---

## Ready for a pilot

| Step | What happens |
|---|---|
| **1. Pilot** | One district hospital OPD: a kiosk at the entrance and a nurse station |
| **2. Validate** | The built-in study compares Priora against triage nurses on real patients |
| **3. Integrate** | Connect to the hospital's HMIS; SMS updates for patients waiting outside |
| **4. Scale** | District-wide early warning across connected hospitals |

**What a pilot would add** (honest scope of this prototype): time-slot appointments, CNIC-linked identity, HMIS and lab integration, hospital-managed staff accounts, paediatric triage scoring, offline mode, and clinical sign-off of the triage rules.

**Sustainable Development Goals:** **SDG 3** (good health: faster emergency care, earlier outbreak detection) · **SDG 10** (fairer access for low-literacy and Urdu-speaking patients) · **SDG 9** (resilient health infrastructure).

---

## Try it yourself

**[priora.asjad.dev](https://priora.asjad.dev)**: the kiosk, impact simulator and evaluation are public. Staff screens use these demo accounts (password **`priora2026`** for all, or one click on the sign-in page):

| Role | Username | Sees |
|---|---|---|
| Triage nurse | `nurse.ayesha` | Patients awaiting triage |
| Emergency doctor | `dr.emergency` | Emergency queue, briefs, consultations |
| Cardiology doctor | `dr.cardio` | Cardiology queue |
| Any other department | `dr.medical`, `dr.surgical`, `dr.ortho`, `dr.gynae`, `dr.paeds`, `dr.ent`, `dr.eye`, `dr.derm`, `dr.psych`, `dr.dental` | That department's queue |
| Records clerk | `records.bilal` | Records desk |
| District health officer | `officer.dho` | Early warning |
| Medical superintendent | `admin` | Everything, including clinical validation |

**A 3-minute walkthrough:**
1. **Kiosk** ([/kiosk](https://priora.asjad.dev/kiosk), turn your sound on): enter **`AHMED54K7Q`** → *Find me* → say or type a complaint. Try something vague like *"pait ke neeche dard hai"* as a 28-year-old woman to hear Priora ask a follow-up question in Urdu → answer → confirm and get a token.
2. **Nurse** (`nurse.ayesha`): open his token, enter HR 130 · RR 30 · BP 95 · Temp 37, pick your own colour, then watch SATS reveal **RED**. Confirm.
3. **Doctor** (`dr.emergency`): Ahmed is at the top. Read the brief, click any citation to see the original report, then record the consultation.
4. **Early warning** (`officer.dho`): see the dengue cluster in G-9 and the diarrhoea cluster in Dhok Hassu, each with an AI-written response brief.
5. **Validation** (`admin`): watch your triage appear in the agreement statistics.

---

## Under the hood

For judges and engineers. Priora's AI does **seven distinct jobs**, each with a narrow, checkable output, plus a model **we trained ourselves**.

| | AI component | What goes in → what comes out |
|---|---|---|
| 1 | **Intake understanding** | Voice or text (Urdu, Roman Urdu, English) → structured findings and SATS signs, each with the patient's words as evidence |
| 2 | **Department routing** | Findings + age, sex, pregnancy + known history → department, confidence and reasons |
| 3 | **Document reading** | Photo of a paper report → typed facts (diagnoses, medications, labs, allergies) with flags and their location on the page |
| 4 | **Cited pre-consultation brief** | All facts + today's complaint → a ranked brief where every line cites its sources |
| 5 | **Syndrome tagging** | Each intake → WHO-style surveillance syndromes (dengue-like, acute watery diarrhoea, …) |
| 6 | **Outbreak alert brief** | Detected cluster statistics (incl. hospital spread and surge projection) → a cited brief for the health officer with actions from a standard checklist |
| 7 | **Follow-up planner** (talking kiosk) | Findings + current colour → the single yes/no question whose answer could raise the triage, or none. Candidates are restricted by code to signs that would change the outcome |
| ★ | **Priora Lite** (our own model) | Character + word n-gram classifier trained on 5,176 Gemini-generated complaints → SATS signs + department, offline, ~8 ms. [Model card](ml/README.md) |

**Rules where safety matters:** SATS triage (TEWS + discriminators), queue ordering, outbreak detection (CDC EARS-style aberration scoring) and surge projection (log-linear trend, capped growth) are deterministic code, not AI.

| The AICON frame | Priora |
|---|---|
| **Problem** | Wrong-door visits, flat queues, unread paper history, late outbreak detection |
| **Data / Input** | Patient voice/text, nurse vitals, photos of paper reports, anonymous intake trends |
| **AI Component** | The seven components above (Gemini on Vertex AI) + Priora Lite, our own offline model |
| **Solution / Output** | Explained triage colour, department and token, severity queues, cited brief, consultation record, outbreak alerts |
| **Impact** | Critical waits from an hour to a minute, fewer redirects, doctor hours returned, earlier outbreak response |

**Engineering choices we measured:** we benchmarked six model setups. The newest preview models swung between 2 and 37 seconds per patient, so the real-time path uses stable **Gemini 2.5 Flash / Flash-Lite**, with timeouts and automatic fallback. Same 100% accuracy at roughly 6× the speed. **61 unit tests** cover the triage engine, queue ordering, simulator, outbreak detection and agreement statistics.

**Stack:** Next.js · TypeScript · Tailwind CSS · Google Gemini on Vertex AI · Neon Postgres + Drizzle · Vercel Blob (private) · Vercel.

<details>
<summary><b>Run it locally</b></summary>

Requires Node 24+, a Google Cloud project with Vertex AI, and a Postgres database (Neon).

```bash
npm install
cp .env.example .env.local              # project ID, DATABASE_URL, SESSION_SECRET
gcloud auth application-default login   # local Vertex AI auth
npm run db:migrate                      # create tables
npm run seed                            # demo morning: patients, staff, records, surveillance history
npm run dev                             # http://localhost:3000
```

| Command | Purpose |
|---|---|
| `npm test` | 61 unit tests |
| `npm run eval` | Run the AI pipeline over the 28-case evaluation set |
| `npm run seed` | Reset to the demo data (synthetic) |

</details>

---

## Data, privacy and disclosures

- **All patient data in this project is synthetic.** No real patient records or personal information were used. Sample reports were generated from templates with fictional names, facilities and values. Surveillance history and validation pilot records are synthetic and labelled as such in the app.
- In a real deployment, data stays in the hospital's own cloud project, with role-based access and a full audit trail.
- Priora is **decision support**: a clinician confirms every triage, and an examination follows every brief. No diagnosis is shown to patients.

| Third-party resource | Used for |
|---|---|
| Google Gemini 2.5 Flash / Flash-Lite (Vertex AI) | All seven AI components; teacher data for Priora Lite |
| Gemini 2.5 Flash TTS | Pre-recorded Urdu kiosk voice; synthesised speech for the voice evaluation |
| scikit-learn | Training Priora Lite (inference re-implemented in TypeScript) |
| South African Triage Scale (SATS) | Triage protocol (public clinical guideline), implemented as rules |
| CDC EARS method · WHO syndromic case definitions | Outbreak detection approach and syndrome definitions |
| Next.js, Tailwind CSS, shadcn/ui, Drizzle ORM, qrcode | Open-source frameworks and libraries |
| Google Chrome (headless) | Rendering the synthetic sample reports |
| Claude Code (AI coding assistant) | Coding and design assistance during the build |

No code, models or datasets were prepared before the event. Everything was built during AICON'26.

---

<p align="center"><b>Priora: the right patient, first.</b><br/>Built for AICON'26 Build With AI · SEECS, NUST, Islamabad</p>
