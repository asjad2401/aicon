import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { Impact } from "./impact";

export const metadata: Metadata = { title: "Impact simulator · Priora" };

export default function ImpactPage() {
  return (
    <main className="flex min-h-screen flex-col bg-muted/30">
      <AppHeader title="Impact simulator" />
      <Impact />
    </main>
  );
}
