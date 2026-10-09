import type { getVisitDetail, listQueue } from "@/lib/visits";

/** Shape after JSON transport: Dates become ISO strings. */
type Serialized<T> = T extends Date
  ? string
  : T extends (infer U)[]
    ? Serialized<U>[]
    : T extends object
      ? { [K in keyof T]: Serialized<T[K]> }
      : T;

export type QueueEntry = Serialized<Awaited<ReturnType<typeof listQueue>>[number]>;
export type VisitDetail = Serialized<NonNullable<Awaited<ReturnType<typeof getVisitDetail>>>>;

export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? res.statusText);
  return res.json();
}

export async function postJSON<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? res.statusText);
  return data;
}

export function formatWait(minutes: number) {
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${Math.floor(minutes)}m`;
  return `${Math.floor(minutes / 60)}h ${Math.floor(minutes % 60)}m`;
}
