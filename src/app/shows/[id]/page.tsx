import { notFound } from "next/navigation";
import { BandLogo } from "@/components/band-logo";
import { EventArtwork } from "@/components/event-artwork";
import { EventShare } from "@/components/event-share";
import { EventRsvp } from "@/components/event-rsvp";
import { EventAttendanceProvider } from "@/components/event-attendance-provider";
import { EventLocation } from "@/components/event-location";
import { Icon } from "@/components/icon";
import { getBandEvent } from "@/lib/facebook";
import { partitionEvents } from "@/lib/facebook-events";
import { eventDateLabel, getEventMetadata, getEventShare } from "@/lib/event-sharing";
import { siteOrigin } from "@/lib/site";
import styles from "./show.module.css";

type Props = { params: Promise<{ id: string }> };
export const revalidate = 900;
export async function generateStaticParams() { return []; }

export async function generateMetadata({ params }: Props) {
  const event = await getBandEvent((await params).id);
  if (!event) notFound();
  return getEventMetadata(event, siteOrigin);
}

export default async function Show({ params }: Props) {
  const event = await getBandEvent((await params).id);
  if (!event) notFound();
  const upcoming = partitionEvents([event]).upcoming.length > 0;
  return <>
    <a href="#main" className="skip-link">Skip to content</a>
    <header className="site-header relative mx-auto flex max-w-[1400px] items-center justify-between px-5 md:px-10 lg:px-16">
      <a href="/" aria-label="The Jim Atkinson Band, home" className="brand"><BandLogo variant="header" /></a>
      <a href="/#shows" className={styles.back}>All shows <Icon name="arrowDown" size={16} /></a>
    </header>
    <main id="main" className={`${styles.page} mx-auto max-w-[1400px] px-5 md:px-10 lg:px-16`}>
      <article className={styles.event}>
        <div className={styles.poster}><EventArtwork src={event.coverUrl} /></div>
        <div className={styles.copy}>
          <p className="eyebrow section-label"><span className="accent-dot" aria-hidden="true" /> {upcoming ? "UPCOMING SHOW" : "FROM THE ARCHIVE"}</p>
          <h1 className="font-display">{event.title}</h1>
          <p className={styles.date}><time dateTime={event.startsAt}>{eventDateLabel(event)}</time></p>
          {(event.venue || event.location) && <p className={styles.venue}><EventLocation venue={event.venue} location={event.location} /></p>}
          {upcoming ? <EventAttendanceProvider>
            <EventRsvp eventId={event.id} eventUrl={event.eventUrl} title={event.title}
              attendingCount={event.attendingCount} interestedCount={event.interestedCount}>
              <EventShare share={getEventShare(event, siteOrigin)} dateLabel={eventDateLabel(event)} venue={event.venue} location={event.location}
                imagePath={`/shows/${event.id}/opengraph-image`} coverUrl={event.coverUrl} />
            </EventRsvp>
          </EventAttendanceProvider> : <div className={styles.actions}>
            <a href={event.eventUrl} target="_blank" rel="noopener noreferrer">The details <Icon name="arrowUpRight" size={16} /><span className="sr-only"> on Facebook (opens in a new tab)</span></a>
          </div>}
          <p className={styles.note}>Good music. Good company. Bring someone along.</p>
        </div>
      </article>
      <a className={styles.allShows} href="/#shows">Find your next good night <Icon name="arrowUpRight" size={17} /></a>
    </main>
  </>;
}
