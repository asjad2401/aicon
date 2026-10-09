# Priora — AI Triage & Records for Government OPDs

> **AICON'26 · Build With AI · Domain: Health Operations**
> Built solo during AICON'26 (9–10 October 2026), SEECS, NUST.

**Live demo:** _coming soon_ · **Demo video:** _coming soon_

> ⚠️ Status: in active development during the hackathon. Sections marked _TBD_ will be filled as features land.

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

_TBD — results from the built-in OPD simulator (FIFO single line vs Priora) will be reported here, with all assumptions stated._

## Evaluation

_TBD — triage colour accuracy, under-triage rate, over-triage rate and department routing accuracy on the synthetic vignette set (English, Roman Urdu, Urdu)._

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
| Data | Neon Postgres + Drizzle ORM · Vercel Blob (images/audio) |
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
| `npm test` | Unit tests for the SATS triage engine |
| `npm run eval` | Runs the full AI pipeline over the vignette set → `eval/results.json` |
| `npm run db:generate` | Generate a SQL migration after schema changes |

## Demo access

_TBD — deployed link, demo roles and staff PIN._

## Data & privacy

- **All patient data in this project is synthetic.** No real patient records, reports or personal information were used.
- Sample medical reports were generated from templates using fictional names, facilities and values.
- In production, data would stay within the hospital's own cloud project, with access controls and audit logs.

## Disclosures & third-party resources

| Resource | Use |
|---|---|
| Google Gemini (Vertex AI) | All four AI components |
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
