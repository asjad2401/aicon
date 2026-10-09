import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { DEPARTMENT_BY_ID, type DepartmentId } from "@/lib/routing/departments";
import { DoctorQueue } from "./doctor-queue";

async function Department({ params }: { params: Promise<{ dept: string }> }) {
  const { dept } = await params;
  const department = DEPARTMENT_BY_ID[dept as DepartmentId];
  if (!department) notFound();
  return (
    <>
      <AppHeader title={`Doctor · ${department.name}`} />
      <DoctorQueue department={department.id} />
    </>
  );
}

export default function DoctorPage({ params }: PageProps<"/doctor/[dept]">) {
  return (
    <main className="flex h-screen flex-col bg-muted/30">
      <Suspense>
        <Department params={params} />
      </Suspense>
    </main>
  );
}
