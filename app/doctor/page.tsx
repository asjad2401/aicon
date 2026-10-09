import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { DEPARTMENTS } from "@/lib/routing/departments";

export const metadata: Metadata = { title: "Doctor · Priora" };

export default function DoctorIndex() {
  return (
    <main className="flex min-h-screen flex-col bg-muted/30">
      <AppHeader title="Doctor" />
      <div className="mx-auto w-full max-w-4xl p-8">
        <h1 className="mb-6 text-2xl font-semibold">Choose your department</h1>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {DEPARTMENTS.map((d) => (
            <Link
              key={d.id}
              href={`/doctor/${d.id}`}
              className="flex flex-col rounded-xl border bg-card p-4 transition hover:border-primary hover:shadow-sm"
            >
              <span className="font-semibold">{d.name}</span>
              <span className="font-urdu text-muted-foreground">{d.urdu}</span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
