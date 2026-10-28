import { getEventLocation } from "@/lib/event-location";
import styles from "./event-location.module.css";

export function EventLocation({ venue, location }: { venue?: string | null; location?: string | null }) {
  const place = getEventLocation({ venue, location });
  if (!place) return null;

  return <a className={styles.link} href={place.mapUrl} target="_blank" rel="noopener noreferrer"
    aria-label={`Open ${place.label} in Google Maps (opens in a new tab)`}>{place.label}</a>;
}
