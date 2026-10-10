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
      <header className="ink-panel -mx-4 flex flex-wrap items-center justify-between gap-3 px-6 py-3">
        <span className="flex items-center gap-2 font-display text-2xl font-semibold tracking-tight">
          Priora <span className="font-urdu text-base font-normal text-[#f2f2f2]/60">مریض کا استقبال</span>
        </span>
        <span className="text-sm">
          <span className="font-medium">{h.full}</span> <span className="text-[#f2f2f2]/60">· {h.city} · OPD Intake</span>
        </span>
        <span className="flex flex-wrap gap-1 font-mono text-[10px] uppercase tracking-wider text-[#f2f2f2]/50">
          Kiosk at:
          {HOSPITALS.map((x) => (
            <Link key={x.id} href={`/kiosk?hospital=${x.id}`} className={x.id === id ? "font-semibold text-[#f2f2f2]" : "hover:text-[#f2f2f2]"}>
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
    <main className="flex min-h-screen flex-col px-4">
      <Suspense>
        <KioskForHospital searchParams={searchParams as Promise<{ hospital?: string }>} />
      </Suspense>
    </main>
  );
}
