// Dev utility: run AI document extraction on a sample image.
import { readFile } from "node:fs/promises";
import { extractDocument } from "@/lib/ai/documents";
for (const f of process.argv.slice(2)) {
  const t = Date.now();
  const { data, model } = await extractDocument({ base64: (await readFile(f)).toString("base64"), mimeType: "image/jpeg" });
  console.log(`\n${f} → ${data.doc_type} ${data.date} ${data.facility} quality=${data.quality} (${model}, ${Date.now() - t}ms)`);
  for (const x of data.facts) console.log(`  [${x.kind}] ${x.label} ${x.value ?? ""} ${x.unit ?? ""} ${x.flag ?? ""} ${x.date ?? ""} box=${x.box_2d.join(",")} c=${x.confidence}`);
}
