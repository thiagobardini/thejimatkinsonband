import "server-only";
import { cache } from "react";
import { readFacebookEvents, type BandEventsResult } from "./facebook-events";

export async function getBandEvents(): Promise<BandEventsResult> {
  return readFacebookEvents({
    token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
    pageId: process.env.FACEBOOK_PAGE_ID?.trim() || undefined,
    graphVersion: process.env.FACEBOOK_GRAPH_VERSION?.trim() || undefined,
  });
}

// Shared by the event page, its metadata, and the poster routes. Invalid IDs never reach Graph.
export const getBandEvent = cache(async (id: string) => {
  if (!/^\d{1,32}$/.test(id)) return null;
  const feed = await getBandEvents();
  if (feed.status === "unavailable") throw new Error("The show feed is temporarily unavailable");
  return feed.events.find((event) => event.id === id) ?? null;
});
