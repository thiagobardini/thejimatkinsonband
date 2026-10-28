"use client";

import { useState } from "react";
import { Pause, Play } from "@phosphor-icons/react";
import type { BandEvent } from "@/lib/facebook-events";
import { Icon } from "./icon";
import styles from "./hero-next-show.module.css";

const date = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric",
});
const time = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York", hour: "numeric", minute: "2-digit",
});

export function HeroNextShow({ event }: { event: Pick<BandEvent, "title" | "startsAt" | "venue" | "location"> }) {
  const [paused, setPaused] = useState(false);
  const starts = new Date(event.startsAt);
  const dateLabel = date.format(starts);
  const timeLabel = `${time.format(starts).replace(":00", "")} ET`;
  const place = event.venue || event.location;
  const duration = Math.max(28, Math.min(60, (event.title.length + (place?.length ?? 0)) * .4));
  const label = `Next show: ${event.title}${place ? ` — ${place}` : ""}. ${dateLabel}, ${timeLabel}. View upcoming shows.`;

  return (
    <div className={`${styles.show} intro-reveal`} data-paused={paused}>
      <a href="#shows" className={styles.link} aria-label={label}>
        <span className={styles.schedule}>
          <span className={styles.label}><span className="accent-dot" aria-hidden="true" /> NEXT SHOW</span>
          <time dateTime={event.startsAt}>{dateLabel}<span className={styles.dateDivider}> / </span>{timeLabel}</time>
        </span>
        <span className={styles.viewport} aria-hidden="true">
          <span className={styles.track} style={{ animationDuration: `${duration}s` }}>
            {[0, 1].map((copy) => (
              <span className={styles.copy} key={copy}>
                <span className={styles.title}>{event.title}</span>
                {place ? <><span className={styles.divider}>/</span><span className={styles.place}>{place}</span></> : null}
                <span className={styles.endMark} aria-hidden="true" />
              </span>
            ))}
          </span>
        </span>
        <span className={styles.direction}><Icon name="arrowDown" size={19} /></span>
      </a>
      <button type="button" className={styles.pause} onClick={() => setPaused((value) => !value)}
        aria-label={paused ? "Resume next show ticker" : "Pause next show ticker"} aria-pressed={paused}>
        {paused ? <Play size={15} weight="light" aria-hidden="true" /> : <Pause size={15} weight="light" aria-hidden="true" />}
      </button>
    </div>
  );
}
