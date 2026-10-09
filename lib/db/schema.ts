import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import type { Intake } from "@/lib/ai/intake";
import type { Routing } from "@/lib/routing/route";
import type { TriageResult, Vitals } from "@/lib/triage/sats";

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  passportToken: text("passport_token").notNull().unique(),
  name: text("name"),
  age: integer("age"),
  sex: text("sex"),
  phone: text("phone"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const visits = pgTable("visits", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .notNull()
    .references(() => patients.id),
  tokenNo: text("token_no").notNull(),
  complaintText: text("complaint_text"),
  language: text("language"),
  audioUrl: text("audio_url"),
  intake: jsonb("intake").$type<Intake>(),
  provisionalTriage: jsonb("provisional_triage").$type<TriageResult>(),
  vitals: jsonb("vitals").$type<Vitals>(),
  finalTriage: jsonb("final_triage").$type<TriageResult>(),
  /** Current effective colour (final if confirmed, else provisional). */
  colour: text("colour").notNull(),
  overrideColour: text("override_colour"),
  overrideReason: text("override_reason"),
  department: text("department").notNull(),
  routing: jsonb("routing").$type<Routing>(),
  status: text("status").notNull().default("waiting"), // waiting | triaged | called | seen | cancelled
  arrivedAt: timestamp("arrived_at", { withTimezone: true }).notNull().defaultNow(),
  triagedAt: timestamp("triaged_at", { withTimezone: true }),
  calledAt: timestamp("called_at", { withTimezone: true }),
  seenAt: timestamp("seen_at", { withTimezone: true }),
  aiModel: text("ai_model"),
  promptVersion: text("prompt_version"),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id")
    .notNull()
    .references(() => patients.id),
  imageUrl: text("image_url").notNull(),
  docType: text("doc_type"),
  docDate: text("doc_date"),
  facility: text("facility"),
  quality: text("quality"),
  extracted: jsonb("extracted"),
  status: text("status").notNull().default("processing"), // processing | done | failed
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const facts = pgTable("facts", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  patientId: integer("patient_id")
    .notNull()
    .references(() => patients.id),
  kind: text("kind").notNull(), // diagnosis | medication | lab | allergy | procedure | vital | other
  label: text("label").notNull(),
  value: text("value"),
  unit: text("unit"),
  date: text("date"),
  box: jsonb("box").$type<[number, number, number, number]>(),
  confidence: real("confidence"),
  verified: boolean("verified").notNull().default(true),
});

export const summaries = pgTable("summaries", {
  id: serial("id").primaryKey(),
  visitId: integer("visit_id")
    .notNull()
    .references(() => visits.id),
  summary: jsonb("summary").notNull(),
  model: text("model"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  visitId: integer("visit_id").references(() => visits.id),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  payload: jsonb("payload"),
  at: timestamp("at", { withTimezone: true }).notNull().default(sql`now()`),
});
