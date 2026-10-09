# Priora — AI Triage & Records for Government OPDs

> **AICON'26 · Build With AI · Domain: Health Operations**
> Built solo during AICON'26 (9–10 October 2026), SEECS, NUST.

**Live demo:** [priora.asjad.dev](https://priora.asjad.dev) · **Demo video:** _link to be added_

| 🔴 RED median wait | Under-triage | Wrong-line redirects | Doctor time on paper files |
|---|---|---|---|
| **1h 5m → 1 min** | **0%** on 28 test cases | **48 → 10** per morning | **5.7 h → 1.9 h** per morning |
| [simulated](#impact) | [evaluated](#evaluation) | [simulated](#impact) | [simulated](#impact) |

---

## The problem

Government hospital OPDs in Pakistan serve hundreds of patients a day with a few minutes per patient. Three failures compound:

1. **Wrong door.** Patients don't know which specialist or OPD to visit for their symptoms. They wait in the wrong line, get redirected, and wait again.
2. **Flat queues.** A patient with chest pain waits in the same first-come-first-served line as a patient with a mild rash. There is no severity sorting before the queue.
3. **A bag of files.** Patients carry years of paper reports and prescriptions. Doctors don't have time to read them, so critical history (an old ECG, a rising HbA1c, a drug allergy) is missed.

_Problem identified, and the solution reviewed, with input from a medical student with first-hand experience of government OPDs. Their feedback: severity-based routing is the core value, **SATS is the triage scale in use**, and an AI history brief is useful for routing, with a proper checkup always following. Priora is designed around exactly that._

## The solution

Priora is an **operations system for the OPD**, not a consumer symptom checker. It sits **before the queue**:

1. **Intake:** the patient describes symptoms by **voice or text in Urdu, Roman Urdu or English** at a kiosk or on their phone.
2. **Triage:** findings are scored with the **South African Triage Scale (SATS)**, a protocol designed for low-resource settings, into 🔴 Red · 🟠 Orange · 🟡 Yellow · 🟢 Green. A nurse adds vitals and confirms.
3. **Routing:** the patient is directed to the right department (Medical, Surgical, Gynae/Obs, Cardiology, ENT, …).
4. **Queue:** each department's queue is ordered by severity, with a wait-time fairness rule.
5. **Records:** photos of old reports are read by AI and turned into a **one-page pre-consultation brief focused on today's complaint**, where **every line links back to the source report**. Known history also sharpens routing (e.g. a known cardiac patient with chest pain goes to Cardiology). The brief orients the doctor; a proper examination always follows.
6. **Health passport:** the digitized history is attached to a **QR code** on the token slip, so the bag of files is no longer needed.

```
Problem → Data/Input → AI Component → Solution/Output → Impact
```

| Stage | What it is in Priora |
|---|---|
| **Data / Input** | Patient voice/text (multilingual), nurse-entered vitals, photos of paper medical reports |
| **AI Component** | Multimodal findings extraction · department routing · document understanding · complaint-aware cited summarization |
| **Solution / Output** | Triage colour with reason trail, department + token, severity-sorted queues, cited one-page history, QR health passport |
| **Impact** | Critical patients seen sooner, fewer misdirected visits, less doctor time spent on files (see [Impact](#impact)) |

## How AI is used

AI does four distinct jobs in the pipeline. **It never assigns severity on its own.**

| # | AI component | Input → Output | Why AI |
|---|---|---|---|
| 1 | **Intake extraction** | Audio/text (Urdu / Roman Urdu / English) → structured findings + matched SATS discriminators, each with the patient's own words as evidence | Free-form, multilingual, low-literacy speech can't be parsed with rules |
| 2 | **Department routing** | Findings + age/sex/pregnancy + known history → department, confidence, reasons | Maps messy symptom combinations to specialties; low confidence falls back to Medical OPD + nurse review |
| 3 | **Document understanding** | Phone photo of a lab report / prescription / discharge slip → typed facts (diagnoses, meds, labs, allergies) with dates and **bounding boxes** | Handwriting, mixed languages, skewed photos |
| 4 | **Cited pre-consultation brief** | All extracted facts + today's complaint → ranked brief; **every claim cites source facts**, and uncited claims are dropped. Orientation only; examination follows | Relevance depends on the complaint (chest pain → surface the old ECG) |

**Safety design**
- **Deterministic triage:** AI extracts findings; fixed SATS rules (TEWS score + discriminators) assign the colour. Any emergency sign forces Red.
- **Human in the loop:** a nurse confirms or overrides every triage (overrides are logged).
- **Explainable:** every triage shows its reason trail (e.g. _"HR 128 → +2 · chest pain → Orange"_).
- **Verifiable:** every summary line links to a highlighted region of the original document.
- **Evaluated:** triage is tested against a vignette set; we report the **under-triage rate** (see [Evaluation](#evaluation)).
- **Decision support only:** no diagnosis is shown to patients.

## Impact

Measured with the built-in **OPD simulator** ([/impact](https://priora.asjad.dev/impact)): a discrete-event simulation of one morning in which **the identical synthetic patient stream** goes through today's single first-come-first-served line and through Priora. Only the process changes.

**Default scenario:** 300 patients over 4 hours, 4 doctors, 4-min mean consult, colour mix 2 / 10 / 30 / 58 % (RED → GREEN), 15 % of patients join the wrong line today vs **3.6 % with Priora** (the department miss rate measured on our eval set), 40 % carry old files (3 min reading today vs 1 min with the cited brief).

| | Today | With Priora |
|---|---|---|
| RED median wait | 1h 5m | **1 min** |
| ORANGE seen within the 10-min SATS target | 14 % | **100 %** |
| YELLOW seen within 60 min | 40 % | **100 %** |
| Wrong-line redirects | 48 | **10** |
| Doctor time spent on paper files | 5.7 h | **1.9 h** |
| Last patient seen (minutes after opening) | 420 | **343** (77 min earlier) |

**Trade-off, stated plainly:** GREEN (routine) patients wait longer (median 1h 8m → 1h 37m) because critical patients now go first. They all stay within the SATS 4-hour target, and a fairness rule promotes any GREEN patient who passes it. Every assumption is a slider on the page; the simulation is deterministic (seeded) and unit-tested.

## Evaluation

28 synthetic patient descriptions (English, Roman Urdu and Urdu script), each with an expected SATS colour and department, run through the **real pipeline**: AI extraction → deterministic SATS rules → AI routing. Results: [/eval](https://priora.asjad.dev/eval) · data: [`eval/`](eval/).

| Metric | Result |
|---|---|
| Triage colour accuracy | **100 %** (28/28) |
| **Under-triage rate** (serious case marked less urgent) | **0 %** |
| Over-triage rate | 0 % |
| Department, exact match | 96.4 % |
| Department, clinically acceptable | 100 % |
| Median latency (extraction + routing) | 6.0 s |

Honest limitations: a small set written by the team, text input only (voice tested manually), provisional colour without vitals. Expectations were fixed before runs and not edited after seeing results. Reproduce with `npm run eval`.

**Model choice was measured too:** the newest Gemini 3.x preview models showed 2–37 s latency swings, so the real-time path uses stable `gemini-2.5-flash` (extraction, documents, brief) and `gemini-2.5-flash-lite` (routing, fallback), with 15 s timeouts and automatic fallback. The model swap kept 100 % accuracy at ~6× lower latency.

## Architecture

```
 Kiosk / Phone ──► /api/intake ──► Gemini (AI #1 extraction) ──► SATS engine ──► Gemini (AI #2 routing)
                                                                     │
 Nurse station ──► vitals ──► TEWS ──► final colour ◄────────────────┘
                                                                     │
 Records desk ──► photo ──► Gemini (AI #3 doc understanding) ──► facts (w/ bounding boxes)
                                                                     │
 Doctor dashboard ◄── priority queue ◄── Gemini (AI #4 cited summary) ◄┘
```

| Layer | Technology |
|---|---|
| App | Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui |
| AI | Google Gemini via **Vertex AI** (`google-genai` SDK) with structured JSON output |
| Data | Neon Postgres + Drizzle ORM · Vercel Blob (**private** storage for report photos, streamed only through the app) |
| Hosting | Vercel |

**Why Vertex AI:** enterprise data controls (prompts are not used for model training) and a path to healthcare-compliant deployment, which matters for a health product.

## Run locally

Requirements: Node 24+, a Google Cloud project with Vertex AI enabled, a Postgres database (Neon).

```bash
npm install
cp .env.example .env.local        # fill in project ID and DATABASE_URL
gcloud auth application-default login   # local Vertex AI auth (no key file needed)
npm run db:migrate                # create tables
npm run dev                       # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm test` | 48 unit tests: SATS triage engine, queue ordering, impact simulator |
| `npm run eval` | Runs the full AI pipeline over the vignette set → `eval/results.json` |
| `npm run seed` | Resets the database to the demo OPD morning (synthetic) |
| `npm run db:generate` | Generate a SQL migration after schema changes |

## Demo access

Open **[priora.asjad.dev](https://priora.asjad.dev)**. No login (staff authentication is out of scope for the MVP). Each role has its own screen:

| Screen | Path |
|---|---|
| Patient kiosk | [/kiosk](https://priora.asjad.dev/kiosk) |
| Triage nurse | [/nurse](https://priora.asjad.dev/nurse) |
| Doctor (pick a department) | [/doctor](https://priora.asjad.dev/doctor) |
| Records desk | [/records](https://priora.asjad.dev/records) |
| Impact simulator | [/impact](https://priora.asjad.dev/impact) |
| Evaluation | [/eval](https://priora.asjad.dev/eval) |

**Suggested walkthrough (returning patient with chest pain):**
1. **Kiosk:** enter passport code **`AHMED54K7Q`** → *Find me* → speak or type *"seenay mein dard hai, baayen baazu tak ja raha hai, paseena aa raha hai"* → confirm → token slip with QR.
2. **Nurse:** open his token, enter HR 130, RR 30, SBP 95, Temp 37 → TEWS 7 → **RED** → confirm (moves to Emergency).
3. **Doctor → Emergency:** he is at the top. Read the cited brief; click any `[n]` to see the source report with the fact highlighted.
4. **Records:** `/records?code=AHMED54K7Q` shows his 5 digitised reports. *Use sample documents* works for any patient.

## Data & privacy

- **All patient data in this project is synthetic.** No real patient records, reports or personal information were used.
- Sample medical reports were generated from templates using fictional names, facilities and values.
- In production, data would stay within the hospital's own cloud project, with access controls and audit logs.

## Disclosures & third-party resources

| Resource | Use |
|---|---|
| Google Gemini 2.5 Flash / Flash-Lite (Vertex AI) | All four AI components |
| Google Chrome (headless) | Rendering the synthetic sample reports in `public/samples/` |
| South African Triage Scale (SATS) | Triage protocol (public clinical guideline); implemented as deterministic rules |
| Next.js, Tailwind CSS, shadcn/ui, Drizzle ORM | Open-source frameworks and libraries |
| Claude Code (AI coding assistant) | Used as a coding and design assistant during the build |

No code, models or datasets were prepared before the event. All work was done during AICON'26.

## Roadmap

- Paediatric TEWS and obstetric triage
- SMS token updates for patients waiting outside
- Integration with hospital HMIS / EMR systems
- District-level outbreak signals from aggregated intake data

---

_Built for AICON'26 Build With AI — SEECS, NUST, Islamabad._
