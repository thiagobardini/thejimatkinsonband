import "server-only";
import { cache } from "react";
import { partitionEvents, readFacebookEvents, type BandEventsResult } from "./facebook-events";
import { createAttendanceReader } from "./event-attendance";

export async function getBandEvents({ fresh = false }: { fresh?: boolean } = {}): Promise<BandEventsResult> {
  return readFacebookEvents({
    token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
    pageId: process.env.FACEBOOK_PAGE_ID?.trim() || undefined,
    graphVersion: process.env.FACEBOOK_GRAPH_VERSION?.trim() || undefined,
    fresh,
  });
}

// This fixed server-side source accepts no public event or Page IDs.
export const getBandAttendance = createAttendanceReader(async () => {
  const feed = await getBandEvents({ fresh: true });
  return { ...feed, events: partitionEvents(feed.events).upcoming };
});

// Shared by the event page, its metadata, and the poster routes. Invalid IDs never reach Graph.
export const getBandEvent = cache(async (id: string) => {
  if (!/^\d{1,32}$/.test(id)) return null;
  const feed = await getBandEvents();
  if (feed.status === "unavailable") throw new Error("The show feed is temporarily unavailable");
  return feed.events.find((event) => event.id === id) ?? null;
});
