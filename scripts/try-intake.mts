import { runIntakePipeline } from "@/lib/pipeline";

const cases: { text: string; age: number; sex: string }[] = [
  { text: "seenay mein bohat dard hai, baayen baazu tak ja raha hai, paseena aa raha hai", age: 54, sex: "male" },
  { text: "تین دن سے بخار ہے اور جسم میں درد ہے", age: 30, sex: "female" },
  { text: "I have had an itchy rash on my arms for two weeks", age: 22, sex: "male" },
];

for (const c of cases) {
  const r = await runIntakePipeline({ kind: "text", text: c.text }, c);
  console.log(`\n> ${c.text}`);
  console.log(`  ${r.intake.chief_complaint} | lang=${r.intake.language} conf=${r.intake.confidence}`);
  console.log(`  discriminators: ${r.intake.discriminators.map((d) => `${d.id} ("${d.evidence}")`).join(", ") || "none"}`);
  console.log(`  TRIAGE ${r.triage.colour}${r.triage.provisional ? " (provisional)" : ""} :: ${r.triage.reasons.map((x) => x.text).join(" · ")}`);
  console.log(`  ROUTE ${r.routing.department} (${r.routing.source}, ${r.routing.confidence}) :: ${r.routing.reasons.join(" · ")}`);
  console.log(`  ${r.model}, ${r.ms} ms`);
}
