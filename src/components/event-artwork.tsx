"use client";

import { useCallback, useState } from "react";
import styles from "./band-events.module.css";

export function EventArtwork({ src }: { src: string | null }) {
  // A refreshed Facebook cover starts its own loading lifecycle.
  return <ArtworkImage key={src} src={src} />;
}

function ArtworkImage({ src }: { src: string | null }) {
  const [status, setStatus] = useState(src ? "loading" : "unavailable");
  const checkCachedImage = useCallback((image: HTMLImageElement | null) => {
    if (image?.complete) {
      setStatus(image.naturalWidth > 0 ? "loaded" : "unavailable");
    }
  }, []);

  return (
    <span className={styles.artwork} data-loading={status === "loading"} aria-hidden="true">
      {src && status !== "unavailable" ? (
        <>
          {status === "loading" && <span className={styles.artworkLoading}><span /></span>}
          {/* Facebook's signed covers bypass the optimizer's longer-lived cache. */}
          <img ref={checkCachedImage} src={src} alt="" width={1200} height={630} loading="lazy"
            decoding="async" referrerPolicy="no-referrer"
            onLoad={() => setStatus("loaded")}
            onError={() => setStatus("unavailable")} />
        </>
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
