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

export const staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  name: text("name").notNull(),
  role: text("role").notNull(), // admin | nurse | doctor | records | officer
  department: text("department"), // doctors only
  passwordHash: text("password_hash").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

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
  /** Nurse's independent colour, recorded BLINDED before the system colour is shown (validation). */
  nurseColour: text("nurse_colour"),
  triagedBy: integer("triaged_by"),
  overrideColour: text("override_colour"),
  overrideReason: text("override_reason"),
  department: text("department").notNull(),
  /** Catchment area (for anonymous syndromic surveillance). */
  area: text("area"),
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
  flag: text("flag"), // high | low | abnormal | normal
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

export type Prescription = { drug: string; dose: string; frequency: string; duration: string };

export const consultations = pgTable("consultations", {
  id: serial("id").primaryKey(),
  visitId: integer("visit_id")
    .notNull()
    .unique()
    .references(() => visits.id),
  patientId: integer("patient_id")
    .notNull()
    .references(() => patients.id),
  doctorId: integer("doctor_id").references(() => staff.id),
  notes: text("notes"),
  examination: text("examination"),
  diagnoses: jsonb("diagnoses").$type<string[]>().notNull().default([]),
  prescriptions: jsonb("prescriptions").$type<Prescription[]>().notNull().default([]),
  labOrders: jsonb("lab_orders").$type<string[]>().notNull().default([]),
  disposition: text("disposition").notNull(), // discharged | admitted | referred | follow_up
  referredTo: text("referred_to"),
  followUpDate: text("follow_up_date"),
  // Clinical validation feedback from the doctor
  departmentCorrect: boolean("department_correct"),
  correctDepartment: text("correct_department"),
  briefRating: text("brief_rating"), // accurate | had_error | not_used
  briefIssue: text("brief_issue"),
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
