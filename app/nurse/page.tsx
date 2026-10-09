import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { Nurse } from "./nurse";

export const metadata: Metadata = { title: "Triage nurse · Priora" };

export default function NursePage() {
  return (
    <main className="flex h-screen flex-col bg-muted/30">
      <AppHeader title="Triage nurse" />
      <Nurse />
    </main>
  );
}
