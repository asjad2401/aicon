import { Suspense } from "react";
import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Staff sign in · Priora" };

async function Form({ searchParams }: { searchParams: Promise<{ next?: string; denied?: string }> }) {
  const { next, denied } = await searchParams;
  return <LoginForm next={next} denied={denied} />;
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex min-h-screen flex-col bg-muted/30">
      <AppHeader title="Staff sign in" />
      <div className="flex flex-1 items-start justify-center p-8">
        <Suspense>
          <Form searchParams={searchParams as Promise<{ next?: string; denied?: string }>} />
        </Suspense>
      </div>
    </main>
  );
}
