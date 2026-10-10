import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { Surveillance } from "./surveillance";

export const metadata: Metadata = { title: "District early warning · Priora" };

export default function SurveillancePage() {
  return (
    <main className="flex min-h-screen flex-col bg-muted/30">
      <AppHeader portal="district" title="Early-warning map" />
      <Surveillance />
    </main>
  );
}
