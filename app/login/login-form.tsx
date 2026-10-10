"use client";

import { useState } from "react";
import { Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROLE_LABEL, type Role } from "@/lib/auth/roles";

export const DEMO_PASSWORD = "priora2026";

const DEMO_ACCOUNTS: { username: string; name: string; role: Role; note: string }[] = [
  { username: "nurse.ayesha", name: "Nurse Ayesha", role: "nurse", note: "Triage station" },
  { username: "dr.emergency", name: "Dr. Hamid", role: "doctor", note: "Emergency" },
  { username: "dr.cardio", name: "Dr. Sana", role: "doctor", note: "Cardiology" },
  { username: "dr.medical", name: "Dr. Imran", role: "doctor", note: "Medical OPD" },
  { username: "dr.surgical", name: "Dr. Asif", role: "doctor", note: "Surgical OPD" },
  { username: "dr.ortho", name: "Dr. Nadia", role: "doctor", note: "Orthopaedics" },
  { username: "dr.gynae", name: "Dr. Rubina", role: "doctor", note: "Gynae / Obs" },
  { username: "dr.paeds", name: "Dr. Kamran", role: "doctor", note: "Paediatrics" },
  { username: "dr.ent", name: "Dr. Zubair", role: "doctor", note: "ENT" },
  { username: "dr.eye", name: "Dr. Mehwish", role: "doctor", note: "Eye" },
  { username: "dr.derm", name: "Dr. Hina", role: "doctor", note: "Dermatology" },
  { username: "dr.psych", name: "Dr. Faisal", role: "doctor", note: "Psychiatry" },
  { username: "dr.dental", name: "Dr. Sara", role: "doctor", note: "Dental" },
  { username: "records.bilal", name: "Bilal", role: "records", note: "Records desk" },
  { username: "officer.dho", name: "Dr. Farah", role: "officer", note: "District early warning" },
  { username: "admin", name: "Dr. Qureshi", role: "admin", note: "Everything + validation" },
];

export function LoginForm({ next, denied }: { next?: string; denied?: string }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(u = username, p = password) {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: u, password: p }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      setLoading(false);
      return;
    }
    // Full navigation so the new session cookie applies everywhere.
    window.location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : data.home;
  }

  return (
    <div className="grid w-full max-w-4xl gap-6 md:grid-cols-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="flex flex-col gap-4 rounded-2xl border bg-card p-6"
      >
        <h1 className="text-2xl font-semibold">Staff sign in</h1>
        {denied && <p className="rounded-md bg-muted p-2 text-sm">Your role can&apos;t open {denied}. Sign in with a different account.</p>}
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Username</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" className="h-11 rounded-lg border px-3" autoFocus />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="h-11 rounded-lg border px-3" />
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="h-11" disabled={loading || !username || !password}>
          {loading ? <Loader2 className="animate-spin" /> : <LogIn />} Sign in
        </Button>
        <p className="text-xs text-muted-foreground">Patients don&apos;t sign in: the kiosk and token slips are public.</p>
      </form>

      <div className="flex flex-col gap-2 rounded-2xl border bg-card p-6">
        <p className="font-semibold">Demo accounts</p>
        <p className="text-sm text-muted-foreground">
          Password for all: <code className="rounded bg-muted px-1">{DEMO_PASSWORD}</code>. Click to sign in.
        </p>
        {(["nurse", "doctor", "records", "officer", "admin"] as Role[]).map((role) => (
          <div key={role} className="flex flex-col gap-1.5">
            <p className="mt-1 text-xs font-medium uppercase text-muted-foreground">{ROLE_LABEL[role]}</p>
            <div className={role === "doctor" ? "grid grid-cols-2 gap-1.5" : "flex flex-col gap-1.5"}>
              {DEMO_ACCOUNTS.filter((a) => a.role === role).map((a) => (
                <button
                  key={a.username}
                  onClick={() => submit(a.username, DEMO_PASSWORD)}
                  disabled={loading}
                  className="flex flex-col rounded-lg border px-3 py-1.5 text-left text-sm hover:border-primary hover:bg-muted/50"
                >
                  <span className="font-medium">{role === "doctor" ? a.note : a.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {role === "doctor" ? a.name : a.note} · <code>{a.username}</code>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export { DEMO_ACCOUNTS };
