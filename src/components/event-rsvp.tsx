import styles from "./event-rsvp.module.css";

export function EventRsvp({ eventUrl, title }: { eventUrl: string; title: string }) {
  return <div className={styles.actions} role="group" aria-label={`Respond to ${title} on Facebook`}>
    {["Interested", "Going"].map((response) => <a key={response} className={styles.action}
      href={eventUrl} target="_blank" rel="noopener noreferrer"
      aria-label={`${response} — open ${title} on Facebook to respond (opens in a new tab)`}>
      <span>{response}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6 18 18 6M6 6h12v12" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </a>)}
  </div>;
}
