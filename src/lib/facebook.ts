import "server-only";
import { readFacebookEvents, type BandEventsResult } from "./facebook-events";

export async function getBandEvents(): Promise<BandEventsResult> {
  return readFacebookEvents({
    token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN,
    pageId: process.env.FACEBOOK_PAGE_ID?.trim() || undefined,
    graphVersion: process.env.FACEBOOK_GRAPH_VERSION?.trim() || undefined,
  });
}
