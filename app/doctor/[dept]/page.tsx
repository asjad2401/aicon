import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { DEPARTMENT_BY_ID, type DepartmentId } from "@/lib/routing/departments";
import { DoctorQueue } from "./doctor-queue";

async function Department({
  params,
  searchParams,
}: {
  params: Promise<{ dept: string }>;
  searchParams: Promise<{ visit?: string }>;
}) {
  const { dept } = await params;
  const { visit } = await searchParams;
  const department = DEPARTMENT_BY_ID[dept as DepartmentId];
  if (!department) notFound();
  return (
    <>
      <AppHeader title={`Doctor · ${department.name}`} />
      <DoctorQueue department={department.id} initialVisit={visit ? Number(visit) : null} />
    </>
  );
}

export default function DoctorPage({ params, searchParams }: PageProps<"/doctor/[dept]">) {
  return (
    <main className="flex h-screen flex-col bg-muted/30">
      <Suspense>
        <Department params={params} searchParams={searchParams as Promise<{ visit?: string }>} />
      </Suspense>
    </main>
  );
}
