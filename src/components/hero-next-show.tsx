"use client";

import { useEffect, useRef, useState } from "react";
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
  const motionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const moving = motionRef.current?.parentElement;
    const hero = moving?.closest<HTMLElement>(".hero");
    if (!moving || !hero || typeof ResizeObserver === "undefined" || !moving.animate) return;

    const mobile = window.matchMedia("(max-width: 767px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let previousTop = hero.getBoundingClientRect().bottom - moving.getBoundingClientRect().height + window.scrollY;
    let previousWidth = hero.getBoundingClientRect().width;
    let animation: Animation | undefined;
    const cancel = () => animation?.cancel();

    const observer = new ResizeObserver(() => {
      // The footer includes its divider. Measure its layout slot from the unanimated hero.
      const heroBounds = hero.getBoundingClientRect();
      const bounds = moving.getBoundingClientRect();
      const layoutTop = heroBounds.bottom - bounds.height;
      const nextTop = layoutTop + window.scrollY;
      const nextWidth = heroBounds.width;
      const offset = previousTop - nextTop;
      const sameWidth = Math.abs(previousWidth - nextWidth) < .5;
      previousTop = nextTop;
      previousWidth = nextWidth;

      if (!mobile.matches || reduced.matches || !sameWidth || layoutTop + bounds.height < 0 || layoutTop > window.innerHeight) {
        cancel();
        return;
      }
      if (Math.abs(offset) < .5) return;

      // Keep the strip at its current visual position, then ease into its new slot.
      // Document coordinates exclude normal scrolling; only layout movement is animated.
      const transform = getComputedStyle(moving).transform;
      const currentY = transform === "none" ? 0 : new DOMMatrixReadOnly(transform).m42;
      cancel();
      animation = moving.animate([
        { transform: `translate3d(0, ${currentY + offset}px, 0)` },
        { transform: "translate3d(0, 0, 0)" },
      ], { id: "next-show-position", duration: 650, easing: "cubic-bezier(.22, 1, .36, 1)" });
    });

    observer.observe(hero);
    mobile.addEventListener("change", cancel);
    reduced.addEventListener("change", cancel);
    return () => {
      observer.disconnect();
      mobile.removeEventListener("change", cancel);
      reduced.removeEventListener("change", cancel);
      cancel();
    };
  }, []);
  const starts = new Date(event.startsAt);
  const dateLabel = date.format(starts);
  const timeLabel = `${time.format(starts).replace(":00", "")} ET`;
  const place = event.venue || event.location;
  const duration = Math.max(28, Math.min(60, (event.title.length + (place?.length ?? 0)) * .4));
  const label = `Next show: ${event.title}${place ? ` — ${place}` : ""}. ${dateLabel}, ${timeLabel}. View upcoming shows.`;

  return (
    <div ref={motionRef} className={styles.motion}>
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
    </div>
  );
}
