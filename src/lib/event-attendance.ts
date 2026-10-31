import type { BandEventsResult } from "./facebook-events";

export type EventAttendance = {
  id: string;
  attendingCount: number | null;
  interestedCount: number | null;
};

type AttendanceResult = {
  status: BandEventsResult["status"];
  events: EventAttendance[];
};

// One reader per server instance shares successful upcoming attendance briefly.
// Expired requests block on a fresh read, rather than returning stale counts.
export function createAttendanceReader(
  readUpcomingEvents: () => Promise<BandEventsResult>,
  { now = Date.now }: { now?: () => number } = {},
): () => Promise<AttendanceResult> {
  let cached: AttendanceResult | null = null;
  let expiresAt = 0;
  let inFlight: Promise<AttendanceResult> | null = null;

  return () => {
    if (cached && now() < expiresAt) return Promise.resolve(cached);
    if (inFlight) return inFlight;

    inFlight = Promise.resolve().then(readUpcomingEvents).then((feed): AttendanceResult => {
      if (feed.status !== "connected") return { status: feed.status, events: [] };
      const result: AttendanceResult = {
        status: "connected",
        events: feed.events.map(({ id, attendingCount, interestedCount }) => ({
          id, attendingCount, interestedCount,
        })),
      };
      cached = result;
      expiresAt = now() + 60_000;
      return result;
    }).catch((): AttendanceResult => ({ status: "unavailable", events: [] }))
      .finally(() => { inFlight = null; });

    return inFlight;
  };
}
