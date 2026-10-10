import { Suspense } from "react";
import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { Records } from "./records";

export const metadata: Metadata = { title: "Records desk · Priora" };

async function RecordsWithCode({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  return <Records initialCode={code ?? ""} />;
}

export default function RecordsPage({ searchParams }: PageProps<"/records">) {
  return (
    <main className="flex min-h-screen flex-col bg-muted/30">
      <AppHeader portal="hospital" title="Records desk · digitise old reports" />
      <Suspense>
        <RecordsWithCode searchParams={searchParams as Promise<{ code?: string }>} />
      </Suspense>
    </main>
  );
}
