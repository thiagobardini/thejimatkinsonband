"use client";

import type { ReactNode } from "react";
import { useEventAttendance } from "./event-attendance-provider";
import styles from "./event-rsvp.module.css";

const number = new Intl.NumberFormat("en-US");

export function EventRsvp({ eventId, eventUrl, title, attendingCount, interestedCount, children }: {
  eventId: string;
  eventUrl: string;
  title: string;
  attendingCount?: number | null;
  interestedCount?: number | null;
  children?: ReactNode;
}) {
  const current = useEventAttendance(eventId);
  const responses = [
    { count: current ? current.attendingCount : attendingCount, label: "going" },
    { count: current ? current.interestedCount : interestedCount, label: "interested" },
  ].flatMap(({ count, label }) => count == null ? [] : [{ count, label }]);

  return <div className={styles.block}>
    <div className={styles.responses}>
      {responses.length > 0 ? responses.map(({ count, label }) => <a className={styles.action} key={label}
        href={eventUrl} target="_blank" rel="noopener noreferrer"
        aria-label={`${number.format(count)} ${label} — open ${title} on Facebook to respond (opens in a new tab)`}>
        <span><strong>{number.format(count)}</strong> {label}</span><ExternalArrow />
      </a>) : <a className={styles.action} href={eventUrl} target="_blank" rel="noopener noreferrer"
        aria-label={`Open ${title} on Facebook to respond (opens in a new tab)`}>Facebook <ExternalArrow /></a>}
    </div>
    {children}
  </div>;
}

function ExternalArrow() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 18 18 6M6 6h12v12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}
