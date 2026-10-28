import type { BandEvent } from "@/lib/facebook-events";
import { band, bluesDeluxeSession } from "@/lib/band";
import { Icon } from "./icon";
import { EventsCarousel, PastEventsCarousel } from "./past-events-carousel";
import styles from "./band-events.module.css";

const eastern = "America/New_York";
const date = new Intl.DateTimeFormat("en-US", { timeZone: eastern, month: "short", day: "numeric", year: "numeric" });
const shortDate = new Intl.DateTimeFormat("en-US", { timeZone: eastern, weekday: "short", month: "short", day: "numeric" });
const time = new Intl.DateTimeFormat("en-US", { timeZone: eastern, hour: "numeric", minute: "2-digit" });

function showTime(event: BandEvent) {
  const starts = time.format(new Date(event.startsAt)).replace(":00", "");
  if (!event.endsAt) return starts;
  const ends = time.format(new Date(event.endsAt)).replace(":00", "");
  const suffix = starts.match(/\s(AM|PM)$/)?.[0];
  return `${suffix && ends.endsWith(suffix) ? starts.slice(0, -suffix.length) : starts}–${ends}`;
}

export function BandEvents({ events, pastEvents, status }: {
  events: BandEvent[];
  pastEvents: BandEvent[];
  status: "connected" | "unavailable" | "unconfigured";
}) {
  const upcoming = [...events].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt)).slice(0, 6);

  return (
    <section id="shows" aria-labelledby="shows-title" className={`${styles.section} mx-auto max-w-[1400px] px-5 md:px-10 lg:px-16`}>
      <div className={styles.heading}>
        <div>
          <p className="eyebrow section-label"><span className="accent-dot" /> UPCOMING SHOWS</p>
          <h2 id="shows-title" className="section-title font-display uppercase">Catch us live.</h2>
        </div>
        <a href={band.events} target="_blank" rel="noopener noreferrer" className={styles.textLink}>All shows on Facebook <Icon name="arrowUpRight" size={16} /></a>
      </div>
      {upcoming.length > 0 ? (
        <>
          <EventsCarousel kind="upcoming" events={upcoming.map((event) => ({
            id: event.id, title: event.title, startsAt: event.startsAt,
            dateLabel: shortDate.format(new Date(event.startsAt)), timeLabel: showTime(event),
            venue: event.venue, location: event.location, coverUrl: event.coverUrl, eventUrl: event.eventUrl,
          }))} />
          <p className={styles.timezone}>Showtimes in Eastern Time.</p>
        </>
      ) : (
        <div className={styles.empty}>
          <p>{status === "connected" ? "The next good night is in the works." : "Find the latest show dates on Facebook."}</p>
          <a href={band.events} target="_blank" rel="noopener noreferrer" className={styles.textLink}>See what’s coming up <Icon name="arrowUpRight" size={16} /></a>
        </div>
      )}
      <PastShows events={pastEvents} />
    </section>
  );
}

export function PastShows({ events }: { events: BandEvent[] }) {
  const featuredId = bluesDeluxeSession.eventHref.match(/\/events\/(\d+)/)?.[1];
  const archive = events.filter((event) => event.id !== featuredId).slice(0, 12);
  if (!archive.length) return null;

  return <PastEventsCarousel events={archive.map((event) => ({
    id: event.id, title: event.title, startsAt: event.startsAt,
    dateLabel: date.format(new Date(event.startsAt)), venue: event.venue || event.location,
    coverUrl: event.coverUrl, eventUrl: event.eventUrl,
  }))} />;
}
