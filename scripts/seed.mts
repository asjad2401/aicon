/** Resets the demo database. Usage: npm run seed (the logic lives in lib/demo/seed.ts). */
import { readFile } from "node:fs/promises";
import { seedDemo } from "@/lib/demo/seed";

await seedDemo({ loadSample: (name) => readFile(`public/samples/${name}.jpg`), log: console.log });
