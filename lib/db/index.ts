import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function connectionString() {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

let instance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  instance ??= drizzle(neon(connectionString()), { schema });
  return instance;
}

export { schema };
