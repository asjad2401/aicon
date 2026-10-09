import { COLOUR_RANK, TARGET_MINUTES, type Colour } from "./triage/discriminators";

/**
 * Discrete-event simulation of one OPD session: today's single FIFO line vs Priora.
 * Both modes see the identical synthetic patient stream (same seed), so differences
 * come only from the process. All assumptions are explicit and adjustable.
 */

export type SimParams = {
  patients: number; // arrivals in the session
  hours: number; // arrival window
  doctors: number;
  consultMinutes: number; // mean consult time (exponential)
  mix: Record<Colour, number>; // colour shares, sum ≈ 1
  /** Share of patients who join the wrong line and must re-queue after a short redirect. */
  misrouteBaseline: number;
  misroutePriora: number;
  redirectMinutes: number;
  /** Share of patients carrying old paper reports. */
  withFiles: number;
  /** Extra consult minutes spent reading paper files, without and with the cited brief. */
  fileMinutesBaseline: number;
  fileMinutesPriora: number;
  seed: number;
};

export const DEFAULT_PARAMS: SimParams = {
  patients: 300,
  hours: 4, // morning OPD surge
  doctors: 4,
  consultMinutes: 4,
  mix: { RED: 0.02, ORANGE: 0.1, YELLOW: 0.3, GREEN: 0.58 },
  misrouteBaseline: 0.15,
  misroutePriora: 0.036, // department top-1 miss rate measured on our eval set
  redirectMinutes: 2,
  withFiles: 0.4,
  fileMinutesBaseline: 3,
  fileMinutesPriora: 1,
  seed: 42,
};

export type ColourStats = {
  n: number;
  medianWait: number;
  p90Wait: number;
  withinTarget: number; // share seen within SATS target time
};

export type SimResult = {
  byColour: Record<Colour, ColourStats>;
  redirects: number;
  doctorMinutesOnFiles: number;
  sessionEnd: number; // minute the last patient started their consult
  waits: { colour: Colour; wait: number }[];
};

/** Deterministic PRNG (mulberry32) so runs are reproducible. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Patient = {
  id: number;
  colour: Colour;
  arrival: number; // first arrival (waits are measured from here)
  readyAt: number; // when the patient is in the correct line
  misrouted: boolean;
  redirected: boolean;
  hasFiles: boolean;
  consult: number; // base consult minutes
};

function makePatients(p: SimParams) {
  const rand = rng(p.seed);
  const exp = (mean: number) => -Math.log(1 - rand()) * mean;
  const colours: Colour[] = ["RED", "ORANGE", "YELLOW", "GREEN"];
  const meanGap = (p.hours * 60) / p.patients;
  let t = 0;
  return Array.from({ length: p.patients }, (_, id) => {
    t += exp(meanGap);
    let r = rand();
    let colour: Colour = "GREEN";
    for (const c of colours) {
      if (r < p.mix[c]) {
        colour = c;
        break;
      }
      r -= p.mix[c];
    }
    return {
      id,
      colour,
      arrival: t,
      // One draw per patient, compared against each mode's rate → same patients misroute in both
      // modes when Priora's rate is lower, keeping the comparison paired.
      misrouteDraw: rand(),
      hasFiles: rand() < p.withFiles,
      consult: Math.max(1, exp(p.consultMinutes)),
    };
  });
}

function percentile(sorted: number[], q: number) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}

export function simulate(p: SimParams, mode: "baseline" | "priora"): SimResult {
  const misrouteRate = mode === "baseline" ? p.misrouteBaseline : p.misroutePriora;
  const fileMinutes = mode === "baseline" ? p.fileMinutesBaseline : p.fileMinutesPriora;

  const pending: Patient[] = makePatients(p).map((x) => ({
    id: x.id,
    colour: x.colour,
    arrival: x.arrival,
    readyAt: x.arrival,
    misrouted: x.misrouteDraw < misrouteRate,
    redirected: false,
    hasFiles: x.hasFiles,
    consult: x.consult,
  }));

  const doctorsFreeAt = Array.from({ length: p.doctors }, () => 0);
  const queue: Patient[] = [];
  const done: (Patient & { start: number })[] = [];
  let redirects = 0;
  let doctorMinutesOnFiles = 0;

  const pick = (now: number) => {
    if (!queue.length) return undefined;
    let best = 0;
    for (let i = 1; i < queue.length; i++) {
      const a = queue[i];
      const b = queue[best];
      if (mode === "baseline") {
        if (a.readyAt < b.readyAt) best = i; // first come, first served (re-queued go to the back)
      } else {
        // Priora: severity band (overdue GREEN → YELLOW band), then share of SATS target used.
        const band = (x: Patient) =>
          x.colour === "GREEN" && now - x.arrival > TARGET_MINUTES.GREEN ? COLOUR_RANK.YELLOW : COLOUR_RANK[x.colour];
        const share = (x: Patient) => (now - x.arrival) / Math.max(TARGET_MINUTES[x.colour], 1);
        if (band(a) > band(b) || (band(a) === band(b) && share(a) > share(b))) best = i;
      }
    }
    return queue.splice(best, 1)[0];
  };

  // Event loop: the earliest-free doctor takes the next patient by policy.
  while (pending.length || queue.length) {
    pending.sort((a, b) => a.readyAt - b.readyAt);
    const freeAt = Math.min(...doctorsFreeAt);
    const nextReady = pending[0]?.readyAt ?? Infinity;
    const now = queue.length ? freeAt : Math.max(freeAt, nextReady);
    while (pending.length && pending[0].readyAt <= now) queue.push(pending.shift()!);

    const d = doctorsFreeAt.indexOf(freeAt);
    const patient = pick(now)!;

    if (patient.misrouted && !patient.redirected) {
      // Joined the wrong line: a short redirect by the doctor, then the back of the right line.
      redirects++;
      doctorsFreeAt[d] = now + p.redirectMinutes;
      pending.push({ ...patient, redirected: true, readyAt: now + p.redirectMinutes });
      continue;
    }

    const files = patient.hasFiles ? fileMinutes : 0;
    doctorMinutesOnFiles += files;
    done.push({ ...patient, start: now });
    doctorsFreeAt[d] = now + patient.consult + files;
  }

  const waits = done.map((x) => ({ colour: x.colour, wait: x.start - x.arrival }));
  const byColour = Object.fromEntries(
    (["RED", "ORANGE", "YELLOW", "GREEN"] as Colour[]).map((c) => {
      const w = waits.filter((x) => x.colour === c).map((x) => x.wait).sort((a, b) => a - b);
      return [
        c,
        {
          n: w.length,
          medianWait: percentile(w, 0.5),
          p90Wait: percentile(w, 0.9),
          withinTarget: w.length ? w.filter((x) => x <= Math.max(TARGET_MINUTES[c], 1)).length / w.length : 1,
        },
      ];
    }),
  ) as Record<Colour, ColourStats>;

  return {
    byColour,
    redirects,
    doctorMinutesOnFiles,
    sessionEnd: Math.max(...done.map((x) => x.start)),
    waits,
  };
}
