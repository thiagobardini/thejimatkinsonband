"use client";

import { useState } from "react";
import styles from "./band-events.module.css";

export function EventArtwork({ src }: { src: string | null }) {
  const [failedSource, setFailedSource] = useState<string | null>(null);

  return (
    <span className={styles.artwork} aria-hidden="true">
      {src && failedSource !== src ? (
        // Facebook cover URLs are signed and refreshed with the feed. Keep them
        // out of the image optimizer's longer-lived cache.
        <img src={src} alt="" width={1200} height={630} loading="lazy"
          decoding="async" referrerPolicy="no-referrer"
          onError={() => setFailedSource(src)} />
      ) : (
        <span className={styles.artworkFallback}>
          <span>THE JIM ATKINSON BAND</span>
          <strong>Live.</strong>
          <span>BLUES · ROCK · ROOTS MUSIC</span>
        </span>
      )}
    </span>
  );
}
