import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { HOSPITALS, HOSPITAL_BY_ID, HOSPITAL_IDS, type HospitalId } from "@/lib/surveillance/config";
import { Kiosk } from "./kiosk";

export const metadata: Metadata = { title: "Kiosk · Priora" };

/** Each kiosk belongs to a hospital in the district network: /kiosk?hospital=hfh */
async function KioskForHospital({ searchParams }: { searchParams: Promise<{ hospital?: string }> }) {
  const { hospital } = await searchParams;
  const id: HospitalId = (HOSPITAL_IDS as readonly string[]).includes(hospital ?? "") ? (hospital as HospitalId) : "pims";
  const h = HOSPITAL_BY_ID[id];
  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-background px-6 py-3">
        <span className="text-xl font-semibold text-brand">Priora</span>
        <span className="text-sm">
          <span className="font-medium">{h.full}</span> <span className="text-muted-foreground">· {h.city} · OPD Intake</span>
        </span>
        <span className="flex gap-1 text-xs text-muted-foreground">
          Kiosk at:
          {HOSPITALS.map((x) => (
            <Link key={x.id} href={`/kiosk?hospital=${x.id}`} className={x.id === id ? "font-semibold text-foreground" : "hover:text-foreground"}>
              {x.name}
            </Link>
          ))}
        </span>
      </header>
      <Kiosk hospital={id} key={id} />
    </>
  );
}

export default function KioskPage({ searchParams }: PageProps<"/kiosk">) {
  return (
    <main className="flex min-h-screen flex-col bg-muted/30">
      <Suspense>
        <KioskForHospital searchParams={searchParams as Promise<{ hospital?: string }>} />
      </Suspense>
    </main>
  );
}
