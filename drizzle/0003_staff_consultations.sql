CREATE TABLE "consultations" (
	"id" serial PRIMARY KEY NOT NULL,
	"visit_id" integer NOT NULL,
	"patient_id" integer NOT NULL,
	"doctor_id" integer,
	"notes" text,
	"examination" text,
	"diagnoses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"prescriptions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"lab_orders" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"disposition" text NOT NULL,
	"referred_to" text,
	"follow_up_date" text,
	"department_correct" boolean,
	"correct_department" text,
	"brief_rating" text,
	"brief_issue" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consultations_visit_id_unique" UNIQUE("visit_id")
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"department" text,
	"password_hash" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "staff_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "nurse_colour" text;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN "triaged_by" integer;--> statement-breakpoint
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_doctor_id_staff_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;