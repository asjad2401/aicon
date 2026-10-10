import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { Impact } from "./impact";
import { LeadTime } from "./leadtime";

export const metadata: Metadata = { title: "Impact simulator · Priora" };

export default function ImpactPage() {
  return (
    <main className="flex min-h-screen flex-col bg-muted/30">
      <AppHeader title="Impact simulator" />
      <div className="pt-6">
        <LeadTime />
      </div>
      <Impact />
    </main>
  );
}
