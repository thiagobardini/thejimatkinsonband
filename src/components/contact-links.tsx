import { Icon } from "@/components/icon";
import { band } from "@/lib/band";
import styles from "./contact-links.module.css";

export function ContactLinks() {
  return (
    <div className={styles.options}>
      <a href={band.emailHref} className={`${styles.link} ${styles.emailLink}`}>
        <span className={styles.copy}>
          <span className={styles.label}>Bookings &amp; good conversations</span>
          <span className={styles.email}>{band.email}</span>
        </span>
        <Icon name="arrowUpRight" size={25} className={styles.arrow} />
      </a>
      <a
        href={band.instagramMessage}
        target="_blank"
        rel="noopener noreferrer"
        className={`${styles.link} ${styles.instagramLink}`}
      >
        <span className={styles.instagramContent}>
          <Icon name="instagram" size={25} className={styles.instagramIcon} />
          <span className={styles.copy}>
            <span className={styles.instagramText}>More of an Instagram person?</span>
            <span className={styles.message}>Send us a message</span>
          </span>
        </span>
        <Icon name="arrowUpRight" size={23} className={styles.arrow} />
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    </div>
  );
}
