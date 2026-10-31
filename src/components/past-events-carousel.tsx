"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { EventShare } from "./event-share";
import type { EventShareData } from "@/lib/event-sharing";
import { EventArtwork } from "./event-artwork";
import { EventRsvp } from "./event-rsvp";
import { EventLocation } from "./event-location";
import { Icon } from "./icon";
import styles from "./band-events.module.css";

export type CarouselShow = {
  id: string;
  title: string;
  startsAt: string;
  dateLabel: string;
  dateMonth?: string;
  dateDay?: string;
  venue: string | null;
  location?: string | null;
  timeLabel?: string;
  coverUrl: string | null;
  eventUrl: string;
  attendingCount?: number | null;
  interestedCount?: number | null;
  share?: EventShareData;
  shareDateLabel?: string;
};

export type PastShow = CarouselShow;

export function EventsCarousel({ events, kind, heading }: {
  events: CarouselShow[];
  kind: "upcoming" | "past";
  heading?: ReactNode;
}) {
  const rail = useRef<HTMLUListElement>(null);
  const [canScroll, setCanScroll] = useState({ previous: false, next: false });
  const upcoming = kind === "upcoming";
  const listId = `${kind}-shows-list`;

  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const update = () => setCanScroll({
      previous: element.scrollLeft > 2,
      next: element.scrollLeft + element.clientWidth < element.scrollWidth - 2,
    });
    update();
    element.addEventListener("scroll", update, { passive: true });
    const resize = new ResizeObserver(update);
    resize.observe(element);
    return () => { element.removeEventListener("scroll", update); resize.disconnect(); };
  }, [events]);

  function move(direction: number) {
    const element = rail.current;
    if (!element) return;
    const distance = upcoming && element.firstElementChild
      ? element.firstElementChild.getBoundingClientRect().width + (parseFloat(window.getComputedStyle(element).columnGap) || 0)
      : element.clientWidth * .85;
    element.scrollBy({
      left: direction * distance,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }

  return (
    <div className={upcoming ? styles.upcomingCarousel : styles.archive} data-single={events.length === 1}>
      <div className={upcoming ? styles.upcomingCarouselHeading : styles.archiveHeading}>
        {heading}
        <div className={styles.controls} role="group" aria-label={`Browse ${kind} shows`}
          data-overflow={canScroll.previous || canScroll.next}>
          <button type="button" onClick={() => move(-1)} disabled={!canScroll.previous}
            aria-label={`Previous ${kind} shows`} aria-controls={listId}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 12H4m6-6-6 6 6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button type="button" onClick={() => move(1)} disabled={!canScroll.next}
            aria-label={`Next ${kind} shows`} aria-controls={listId}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>
      <ul ref={rail} id={listId} className={`${styles.rail}${upcoming ? ` ${styles.upcomingRail}` : ""}`} tabIndex={0}
        data-single={events.length === 1}
        aria-labelledby={upcoming ? "shows-title" : "past-shows-title"} onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault(); move(event.key === "ArrowLeft" ? -1 : 1);
          } else if (event.key === "Home" || event.key === "End") {
            event.preventDefault(); rail.current?.scrollTo({ left: event.key === "Home" ? 0 : rail.current.scrollWidth, behavior: "auto" });
          }
        }}>
        {events.map((event) => (
          <li key={event.id} className={upcoming ? styles.upcomingPoster : styles.pastShow}>
            {upcoming ? (
              <div className={styles.upcomingLayout}>
                <span className={styles.dateStamp} aria-hidden="true"><span>{event.dateMonth}</span><strong>{event.dateDay}</strong></span>
                <a className={styles.posterLink} href={event.eventUrl} target="_blank" rel="noopener noreferrer" aria-label={`Poster and details for ${event.title} on Facebook (opens in a new tab)`}><EventArtwork src={event.coverUrl} /></a>
                <div className={styles.upcomingCopy}>
                  <p className={styles.dateLine}><time dateTime={event.startsAt}>{event.dateLabel}</time>{event.timeLabel && <span>{event.timeLabel}</span>}</p>
                  <h3><a href={event.eventUrl} target="_blank" rel="noopener noreferrer">{event.title}<span className="sr-only"> on Facebook (opens in a new tab)</span></a></h3>
                  {(event.venue || event.location) && <p className={styles.venue}><EventLocation venue={event.venue} location={event.location} /></p>}
                  <EventRsvp eventId={event.id} eventUrl={event.eventUrl} title={event.title}
                    attendingCount={event.attendingCount} interestedCount={event.interestedCount}>
                    {event.share && <EventShare share={event.share} dateLabel={event.shareDateLabel} venue={event.venue} location={event.location}
                      imagePath={`/shows/${event.id}/opengraph-image`} coverUrl={event.coverUrl} />}
                  </EventRsvp>
                </div>
                <a className={styles.rowArrow} href={event.eventUrl} target="_blank" rel="noopener noreferrer" aria-label={`View ${event.title} on Facebook (opens in a new tab)`}><Icon name="arrowUpRight" size={24} /></a>
              </div>
            ) : (
              <a href={event.eventUrl} target="_blank" rel="noopener noreferrer">
                <EventArtwork src={event.coverUrl} />
                <div className={styles.pastMeta}>
                  <time dateTime={event.startsAt}>{event.dateLabel}</time>
                  <Icon name="arrowUpRight" size={17} />
                </div>
                <h4>{event.title}</h4>
                {(event.venue || event.location) && <p>{event.venue}{event.venue && event.location && " · "}{event.location}</p>}
                <span className="sr-only">View event on Facebook (opens in a new tab).</span>
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PastEventsCarousel({ events }: { events: PastShow[] }) {
  return <EventsCarousel events={events} kind="past" heading={
    <div>
      <p className="eyebrow section-label"><span className="accent-dot" aria-hidden="true" /> PAST SHOWS</p>
      <h3 id="past-shows-title" className={`${styles.archiveTitle} section-title font-display uppercase`}>A few stops along the way.</h3>
    </div>
  } />;
}
