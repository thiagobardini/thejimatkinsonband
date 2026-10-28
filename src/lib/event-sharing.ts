import type { Metadata } from "next";
import type { BandEvent } from "./facebook-events";

const eastern = "America/New_York";
const date = new Intl.DateTimeFormat("en-US", { timeZone: eastern, weekday: "short", month: "short", day: "numeric", year: "numeric" });
const time = new Intl.DateTimeFormat("en-US", { timeZone: eastern, hour: "numeric", minute: "2-digit" });

export type EventShareData = { title: string; text: string; url: string };

export function eventPath(id: string): string {
  if (!/^\d{1,32}$/.test(id)) throw new Error("Invalid event ID");
  return `/shows/${id}`;
}

export function eventDateLabel(event: Pick<BandEvent, "startsAt" | "endsAt">) {
  const start = time.format(new Date(event.startsAt)).replace(":00", "");
  const end = event.endsAt ? time.format(new Date(event.endsAt)).replace(":00", "") : null;
  const suffix = start.match(/\s(AM|PM)$/)?.[0];
  const hours = end ? `${suffix && end.endsWith(suffix) ? start.slice(0, -suffix.length) : start}–${end}` : start;
  return `${date.format(new Date(event.startsAt))} · ${hours} ET`;
}

export function getEventShare(event: BandEvent, origin: string): EventShareData {
  return {
    title: event.title,
    text: [eventDateLabel(event), event.venue, event.location].filter(Boolean).join(" · "),
    url: new URL(eventPath(event.id), origin).href,
  };
}

export function getShareLinks(share: EventShareData, ios = false) {
  const message = encodeURIComponent(`${share.title}\n${share.text}\n${share.url}`);
  return { whatsapp: `https://wa.me/?text=${message}`, sms: `sms:${ios ? "&" : "?"}body=${message}` };
}

export function getEventMetadata(event: BandEvent, origin: string): Metadata {
  const share = getEventShare(event, origin);
  return {
    title: `${event.title} | The Jim Atkinson Band`,
    description: share.text,
    alternates: { canonical: share.url },
    openGraph: {
      type: "website", siteName: "The Jim Atkinson Band", locale: "en_US",
      title: event.title, description: share.text, url: share.url,
      images: [{ url: `${share.url}/opengraph-image`, width: 1200, height: 630, alt: `Poster for ${event.title}` }],
    },
    twitter: { card: "summary_large_image", title: event.title, description: share.text, images: [`${share.url}/twitter-image`] },
  };
}
