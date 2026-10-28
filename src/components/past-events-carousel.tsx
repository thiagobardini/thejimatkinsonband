"use client";

import { useEffect, useRef, useState } from "react";
import { EventArtwork } from "./event-artwork";
import { Icon } from "./icon";
import styles from "./band-events.module.css";

export type PastShow = {
  id: string;
  title: string;
  startsAt: string;
  dateLabel: string;
  venue: string | null;
  coverUrl: string | null;
  eventUrl: string;
};

export function PastEventsCarousel({ events }: { events: PastShow[] }) {
  const rail = useRef<HTMLUListElement>(null);
  const [canScroll, setCanScroll] = useState({ previous: false, next: false });

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
    element.scrollBy({
      left: direction * element.clientWidth * .85,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }

  return (
    <div className={styles.archive}>
      <div className={styles.archiveHeading}>
        <div>
          <p className={styles.kicker}>PAST SHOWS</p>
          <h3 id="past-shows-title" className={styles.archiveTitle}>A few stops along the way.</h3>
        </div>
        <div className={styles.controls} role="group" aria-label="Browse past shows"
          data-overflow={canScroll.previous || canScroll.next}>
          <button type="button" onClick={() => move(-1)} disabled={!canScroll.previous}
            aria-label="Previous past shows" aria-controls="past-shows-list">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 12H4m6-6-6 6 6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button type="button" onClick={() => move(1)} disabled={!canScroll.next}
            aria-label="Next past shows" aria-controls="past-shows-list">
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>
      <ul ref={rail} id="past-shows-list" className={styles.rail} tabIndex={0}
        aria-labelledby="past-shows-title" onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault(); move(event.key === "ArrowLeft" ? -1 : 1);
          } else if (event.key === "Home" || event.key === "End") {
            event.preventDefault(); rail.current?.scrollTo({ left: event.key === "Home" ? 0 : rail.current.scrollWidth, behavior: "auto" });
          }
        }}>
        {events.map((event) => (
          <li key={event.id} className={styles.pastShow}>
            <a href={event.eventUrl} target="_blank" rel="noopener noreferrer">
              <EventArtwork src={event.coverUrl} />
              <div className={styles.pastMeta}>
                <time dateTime={event.startsAt}>{event.dateLabel}</time>
                <Icon name="arrowUpRight" size={17} />
              </div>
              <h4>{event.title}</h4>
              {event.venue && <p>{event.venue}</p>}
              <span className="sr-only">View event on Facebook (opens in a new tab).</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
