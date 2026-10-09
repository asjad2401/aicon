import type { NextRequest } from "next/server";
import { z } from "zod";
import { actorOf, requireStaff } from "@/lib/auth/server";
import { saveConsultation } from "@/lib/consultations";
import { DEPARTMENT_IDS } from "@/lib/routing/departments";
import { visitDepartment } from "@/lib/visits";

const text = (max: number) => z.string().trim().max(max);

const BodySchema = z
  .object({
    notes: text(4000).optional(),
    examination: text(4000).optional(),
    diagnoses: z.array(text(200)).max(10),
    prescriptions: z
      .array(z.object({ drug: text(120), dose: text(60), frequency: text(60), duration: text(60) }))
      .max(15),
    labOrders: z.array(text(120)).max(15),
    disposition: z.enum(["discharged", "admitted", "referred", "follow_up"]),
    referredTo: z.enum(DEPARTMENT_IDS).optional(),
    followUpDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    departmentCorrect: z.boolean().optional(),
    correctDepartment: z.enum(DEPARTMENT_IDS).optional(),
    briefRating: z.enum(["accurate", "had_error", "not_used"]).optional(),
    briefIssue: text(500).optional(),
  })
  .refine((b) => b.diagnoses.some((d) => d.length > 0), { message: "Add at least one diagnosis or working impression", path: ["diagnoses"] })
  .refine((b) => b.disposition !== "referred" || b.referredTo, { message: "Choose where the patient is referred", path: ["referredTo"] })
  .refine((b) => b.disposition !== "follow_up" || b.followUpDate, { message: "Choose a follow-up date", path: ["followUpDate"] });

// POST: doctor records the consultation; the visit is closed as seen.
export async function POST(request: NextRequest, ctx: RouteContext<"/api/visits/[id]/consult">) {
  const { id } = await ctx.params;
  const { user, error } = await requireStaff(["doctor", "admin"], { department: await visitDepartment(Number(id)) });
  if (error) return error;

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid consultation" }, { status: 400 });

  const consultation = await saveConsultation(Number(id), { uid: user.uid, actor: actorOf(user) }, parsed.data);
  if (!consultation) return Response.json({ error: "Visit not found" }, { status: 404 });
  return Response.json({ consultation });
}
