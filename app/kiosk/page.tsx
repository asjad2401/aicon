import type { Metadata } from "next";
import { Kiosk } from "./kiosk";

export const metadata: Metadata = { title: "Kiosk · Priora" };

export default function KioskPage() {
  return (
    <main className="flex min-h-screen flex-col bg-muted/30">
      <header className="flex items-center justify-between border-b bg-background px-6 py-3">
        <span className="text-xl font-semibold text-brand">Priora</span>
        <span className="text-sm text-muted-foreground">OPD Intake · <span className="font-urdu">رجسٹریشن</span></span>
      </header>
      <Kiosk />
    </main>
  );
}
