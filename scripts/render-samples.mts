/**
 * Renders synthetic medical documents (HTML → PNG via headless Chrome) for demos.
 * All names, facilities and values are fictional.
 * Usage: npx tsx scripts/render-samples.mts
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const CHROME = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = path.resolve("public/samples");
mkdirSync(OUT, { recursive: true });
const tmp = mkdtempSync(path.join(tmpdir(), "priora-samples-"));

const FOOTER = `<div class="synthetic">Synthetic sample for demonstration · fictional patient and facility</div>`;

/** Wraps a document in a "photo of paper" look: slight rotation, shadow, uneven light. */
function page(body: string, opts: { rotate?: number; handwritten?: boolean } = {}) {
  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Noto+Nastaliq+Urdu&display=swap" rel="stylesheet">
<style>
  body { margin:0; width:900px; height:1200px; background: radial-gradient(circle at 30% 20%, #8a7f72, #4d453d); display:flex; align-items:center; justify-content:center; font-family: Arial, Helvetica, sans-serif; }
  .paper { width:760px; min-height:1020px; background: linear-gradient(160deg, #fffef8 0%, #f6f1e4 60%, #ebe4d2 100%); box-shadow: 0 18px 40px rgba(0,0,0,.45); padding:44px 48px; box-sizing:border-box; transform: rotate(${opts.rotate ?? -1.5}deg); position:relative; color:#1d1d1d; }
  .paper::after { content:""; position:absolute; inset:0; background: linear-gradient(115deg, rgba(255,255,255,.0) 40%, rgba(0,0,0,.06) 70%, rgba(0,0,0,.12)); pointer-events:none; }
  h1 { font-size:24px; margin:0; letter-spacing:.5px; } h2 { font-size:16px; margin:22px 0 8px; border-bottom:1px solid #999; padding-bottom:4px; }
  .sub { font-size:12px; color:#444; } .row { display:flex; justify-content:space-between; font-size:14px; margin:3px 0; }
  table { width:100%; border-collapse:collapse; font-size:14px; margin-top:8px; } th, td { border-bottom:1px solid #ccc; padding:7px 6px; text-align:left; } th { background:#ece6d6; }
  .h { font-weight:bold; } .hand { font-family:'Caveat', cursive; font-size:30px; line-height:1.35; color:#1b2a6b; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:3px double #333; padding-bottom:10px; }
  .synthetic { position:absolute; bottom:14px; left:0; right:0; text-align:center; font-size:10px; color:#999; }
  .urdu { font-family:'Noto Nastaliq Urdu', serif; direction:rtl; }
</style></head><body><div class="paper">${body}${FOOTER}</div></body></html>`;
}

const docs: Record<string, string> = {
  "ahmed-2019-discharge": page(`
    <div class="header"><div><h1>POTOHAR DISTRICT HOSPITAL</h1><div class="sub">Department of Medicine · Rawalpindi</div></div><div class="sub urdu">پوٹھوہار ڈسٹرکٹ ہسپتال</div></div>
    <h2>DISCHARGE SUMMARY</h2>
    <div class="row"><span>Patient: <b>Ahmed Khan</b></span><span>Age/Sex: 49 / M</span></div>
    <div class="row"><span>MR No: PDH-19-04417</span><span>Admitted: 02-06-2019 · Discharged: 05-06-2019</span></div>
    <h2>Diagnosis</h2>
    <p>1. Type 2 Diabetes Mellitus (newly diagnosed)<br>2. Essential Hypertension</p>
    <h2>Presenting complaint</h2><p>Polyuria, polydipsia and generalised weakness for 3 weeks. RBS on arrival 312 mg/dL.</p>
    <h2>Discharge medication</h2>
    <p>Tab. Metformin 500 mg BD<br>Tab. Amlodipine 5 mg OD</p>
    <h2>Advice</h2><p>Diet control, daily walk, HbA1c after 3 months, follow up in Medical OPD.</p>
    <p style="margin-top:40px">Dr. S. Mahmood (FCPS Medicine)</p>`, { rotate: -1.2 }),

  "ahmed-2021-ecg": page(`
    <div class="header"><div><h1>CITY HEART CLINIC</h1><div class="sub">Non-invasive Cardiology · Islamabad</div></div><div class="sub">Date: 14-11-2021</div></div>
    <h2>12-LEAD ECG REPORT</h2>
    <div class="row"><span>Name: <b>Ahmed Khan</b></span><span>Age: 51 Y · Male</span></div>
    <svg width="660" height="140" style="margin:14px 0;background:#fde8e8"><defs><pattern id="g" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" fill="none" stroke="#f5b5b5" stroke-width=".6"/></pattern></defs><rect width="660" height="140" fill="url(#g)"/><polyline fill="none" stroke="#222" stroke-width="1.4" points="0,80 40,80 48,74 56,80 70,80 76,95 82,30 88,105 94,80 120,80 132,92 146,80 190,80 198,74 206,80 220,80 226,95 232,30 238,105 244,80 270,80 282,92 296,80 340,80 348,74 356,80 370,80 376,95 382,30 388,105 394,80 420,80 432,92 446,80 490,80 498,74 506,80 520,80 526,95 532,30 538,105 544,80 570,80 582,92 596,80 660,80"/></svg>
    <table><tr><th>Parameter</th><th>Value</th></tr>
      <tr><td>Rhythm</td><td>Sinus rhythm</td></tr><tr><td>Heart rate</td><td>88 bpm</td></tr>
      <tr><td>PR interval</td><td>160 ms</td></tr><tr><td>QRS duration</td><td>92 ms</td></tr><tr><td>QTc</td><td>430 ms</td></tr></table>
    <h2>Impression</h2>
    <p class="h">T-wave inversion in leads V4–V6. Possible lateral ischaemia.<br>Advised: Echocardiography and cardiology evaluation.</p>
    <p style="margin-top:40px">Reported by: Dr. F. Qureshi, Cardiologist</p>`, { rotate: 1.4 }),

  "ahmed-2022-hba1c": page(`
    <div class="header"><div><h1>AL-NOOR DIAGNOSTICS</h1><div class="sub">Clinical Laboratory · Blue Area, Islamabad</div></div><div class="sub">Lab No: AND-22-118204</div></div>
    <div class="row" style="margin-top:14px"><span>Patient: <b>Mr. Ahmed Khan</b></span><span>Age/Sex: 52 Y / M</span></div>
    <div class="row"><span>Referred by: Self</span><span>Reported: 21-03-2022</span></div>
    <h2>DIABETES PROFILE</h2>
    <table><tr><th>Test</th><th>Result</th><th>Unit</th><th>Reference range</th></tr>
      <tr><td>HbA1c</td><td class="h">7.1 H</td><td>%</td><td>4.0 – 5.6</td></tr>
      <tr><td>Fasting blood sugar</td><td class="h">145 H</td><td>mg/dL</td><td>70 – 100</td></tr>
      <tr><td>Serum creatinine</td><td>0.9</td><td>mg/dL</td><td>0.7 – 1.3</td></tr></table>
    <p class="sub" style="margin-top:30px">Electronically verified. Pathologist: Dr. N. Rizvi</p>`, { rotate: -2 }),

  "ahmed-2024-labs": page(`
    <div class="header"><div><h1>AL-NOOR DIAGNOSTICS</h1><div class="sub">Clinical Laboratory · Blue Area, Islamabad</div></div><div class="sub">Lab No: AND-24-093377</div></div>
    <div class="row" style="margin-top:14px"><span>Patient: <b>Mr. Ahmed Khan</b></span><span>Age/Sex: 54 Y / M</span></div>
    <div class="row"><span>Referred by: Dr. S. Mahmood</span><span>Reported: 12-08-2024</span></div>
    <h2>DIABETES PROFILE</h2>
    <table><tr><th>Test</th><th>Result</th><th>Unit</th><th>Reference range</th></tr>
      <tr><td>HbA1c</td><td class="h">8.4 H</td><td>%</td><td>4.0 – 5.6</td></tr>
      <tr><td>Fasting blood sugar</td><td class="h">178 H</td><td>mg/dL</td><td>70 – 100</td></tr></table>
    <h2>LIPID PROFILE</h2>
    <table><tr><th>Test</th><th>Result</th><th>Unit</th><th>Reference range</th></tr>
      <tr><td>Total cholesterol</td><td class="h">245 H</td><td>mg/dL</td><td>&lt; 200</td></tr>
      <tr><td>LDL cholesterol</td><td class="h">165 H</td><td>mg/dL</td><td>&lt; 100</td></tr>
      <tr><td>HDL cholesterol</td><td class="h">35 L</td><td>mg/dL</td><td>&gt; 40</td></tr>
      <tr><td>Triglycerides</td><td class="h">210 H</td><td>mg/dL</td><td>&lt; 150</td></tr></table>
    <p class="sub" style="margin-top:30px">Electronically verified. Pathologist: Dr. N. Rizvi</p>`, { rotate: 0.8 }),

  "ahmed-2024-prescription": page(`
    <div class="header"><div><h1>Dr. Saad Mahmood</h1><div class="sub">MBBS, FCPS (Medicine) · Consultant Physician<br>Mahmood Clinic, Saddar, Rawalpindi</div></div><div class="sub">PMDC 23417-P</div></div>
    <div class="hand" style="margin-top:18px">
      Name: Ahmed Khan &nbsp;&nbsp; 54 y/M &nbsp;&nbsp; 15/8/24<br>
      c/o: ↑ sugar, occasional chest heaviness on walking<br>
      BP 150/95<br><br>
      <b>Rx</b><br>
      1. Tab Metformin 1000mg — BD<br>
      2. Tab Amlodipine 5mg — OD<br>
      3. Tab Atorvastatin 20mg — HS<br>
      4. Tab Aspirin 75mg — OD after meal<br><br>
      <span style="color:#b00">Allergy: PENICILLIN (rash)</span><br>
      Adv: Echo + cardiology OPD referral. F/U 1 month.
    </div>`, { rotate: -2.4, handwritten: true }),
};

for (const [name, html] of Object.entries(docs)) {
  const file = path.join(tmp, `${name}.html`);
  writeFileSync(file, html);
  const png = path.join(tmp, `${name}.png`);
  const out = path.join(OUT, `${name}.jpg`);
  execFileSync(CHROME, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--virtual-time-budget=4000",
    "--window-size=900,1200",
    `--screenshot=${png}`,
    `file://${file}`,
  ], { stdio: "ignore" });
  // JPEG keeps uploads small (macOS `sips`).
  execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "82", png, "--out", out], { stdio: "ignore" });
  console.log("rendered", path.relative(process.cwd(), out));
}
