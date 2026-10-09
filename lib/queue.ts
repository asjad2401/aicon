import { COLOUR_RANK, TARGET_MINUTES, type Colour } from "./triage/discriminators";

/**
 * Department queue ordering.
 *
 * 1. Severity band first: RED > ORANGE > YELLOW > GREEN.
 * 2. Fairness: a GREEN patient who has waited past the SATS GREEN target (4 h)
 *    is promoted to the YELLOW band, so mild cases are never starved.
 *    A GREEN patient can never overtake ORANGE or RED.
 * 3. Within a band: whoever has used up the largest share of their target time goes first.
 */

export type QueueItem = { colour: Colour; arrivedAt: Date | string };

export type Ranked<T> = T & {
  waitMinutes: number;
  band: number;
  overdue: boolean;
  /** Minutes until the SATS target time; negative = breached. */
  slaRemaining: number;
};

export function rankQueue<T extends QueueItem>(items: T[], now: Date = new Date()): Ranked<T>[] {
  return items
    .map((item) => {
      const waitMinutes = Math.max(0, (now.getTime() - new Date(item.arrivedAt).getTime()) / 60_000);
      const target = TARGET_MINUTES[item.colour];
      const overdue = waitMinutes > target;
      const band =
        item.colour === "GREEN" && overdue ? COLOUR_RANK.YELLOW : COLOUR_RANK[item.colour];
      return { ...item, waitMinutes, band, overdue, slaRemaining: target - waitMinutes };
    })
    .sort((a, b) => {
      if (a.band !== b.band) return b.band - a.band;
      const share = (x: Ranked<T>) => x.waitMinutes / Math.max(TARGET_MINUTES[x.colour], 1);
      return share(b) - share(a);
    });
}
