"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import type { BandPost, BandPostsPage } from "@/lib/facebook-posts";
import { createNewsPager, getInitialNewsSnapshot } from "@/lib/news-pagination";
import { band } from "@/lib/band";
import { Icon } from "./icon";
import styles from "./band-news.module.css";

const postDate = new Intl.DateTimeFormat("en-US", {
  month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York",
});

async function fetchPage(cursor: string, signal: AbortSignal): Promise<BandPostsPage> {
  const response = await fetch(`/api/news?${new URLSearchParams({ cursor })}`, {
    signal, cache: "no-store", headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("News is temporarily unavailable");
  return response.json() as Promise<BandPostsPage>;
}

function NewsImage({ post, onUnavailable }: { post: BandPost; onUnavailable: () => void }) {
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const checkCached = useCallback((image: HTMLImageElement | null) => {
    if (image?.complete) {
      if (image.naturalWidth) setStatus("ready");
      else onUnavailable();
    }
  }, [onUnavailable]);
  if (!post.imageUrl) return null;
  return (
    <a className={styles.image} data-loading={status === "loading"} href={post.permalink} target="_blank" rel="noopener noreferrer"
      aria-label={`View the band's photo from ${postDate.format(new Date(post.publishedAt))} on Facebook (opens in a new tab)`}>
      {status === "loading" && <span className={styles.imageLoading} aria-hidden="true"><span /></span>}
      {/* Facebook's signed images must not sit in the image optimizer's longer-lived cache. */}
      <img ref={checkCached} src={post.imageUrl} alt={post.attachmentTitle || "Photo shared by The Jim Atkinson Band"}
        width={1200} height={800} loading="lazy" decoding="async" referrerPolicy="no-referrer"
        onLoad={() => setStatus("ready")} onError={onUnavailable} />
      {post.kind === "video" && <span className={styles.videoLabel}><Icon name="play" size={14} /> Watch on Facebook</span>}
    </a>
  );
}

function NewsPost({ post }: { post: BandPost }) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const imageUnavailable = useCallback(() => setFailedImage(post.imageUrl), [post.imageUrl]);
  const hasImage = Boolean(post.imageUrl && post.imageUrl !== failedImage);
  // Shared-link URLs belong in the original post; the attachment supplies their readable preview.
  const message = post.message?.replace(/https?:\/\/[^\s]+/g, "").trim();
  const copy = (message || post.attachmentDescription || post.attachmentTitle || post.message)?.replace(/\s+/g, " ").trim();
  return (
    <article className={styles.post} data-image={hasImage}>
      <div className={styles.meta}>
        <time dateTime={post.publishedAt}>{postDate.format(new Date(post.publishedAt))}</time>
      </div>
      <div className={styles.content}>
        {copy && <p className={styles.message}>{copy}</p>}
        <a className={styles.postLink} data-news-post-link href={post.permalink} target="_blank" rel="noopener noreferrer">
          <span>View post</span><Icon name="arrowUpRight" size={15} />
          <span className="sr-only"> on Facebook, {postDate.format(new Date(post.publishedAt))} (opens in a new tab)</span>
        </a>
      </div>
      {hasImage && <NewsImage key={post.imageUrl} post={post} onUnavailable={imageUnavailable} />}
    </article>
  );
}

export function NewsFeed({ initial }: { initial: BandPostsPage }) {
  const [snapshot, setSnapshot] = useState(() => getInitialNewsSnapshot(initial));
  const list = useRef<HTMLUListElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const loadButton = useRef<HTMLButtonElement>(null);
  const followLink = useRef<HTMLAnchorElement>(null);
  const focusAfterLoad = useRef<{ count: number; keyboard: boolean } | null>(null);
  const pager = useRef<ReturnType<typeof createNewsPager> | null>(null);

  useEffect(() => {
    focusAfterLoad.current = null;
    setSnapshot(getInitialNewsSnapshot(initial));
    const controller = createNewsPager({ initial, fetchPage, onChange: setSnapshot });
    pager.current = controller;
    return () => { controller.cancel(); pager.current = null; };
  }, [initial]);

  useEffect(() => {
    const pendingFocus = focusAfterLoad.current;
    if (snapshot.loading || pendingFocus === null) return;
    focusAfterLoad.current = null;
    const nextPost = list.current?.children[pendingFocus.count] as HTMLElement | undefined;
    if (nextPost && viewport.current) {
      // Move only the news window; never scroll the page or another ancestor.
      viewport.current.scrollTo({
        top: Math.max(0, nextPost.offsetTop - 12),
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    }
    if (!pendingFocus.keyboard && loadButton.current) return;
    if (document.activeElement !== loadButton.current && document.activeElement !== document.body) return;
    const target = nextPost?.querySelector<HTMLAnchorElement>("[data-news-post-link]") || loadButton.current || followLink.current;
    target?.focus({ preventScroll: true });
  }, [snapshot.loading, snapshot.posts.length]);

  function loadFromButton(event: MouseEvent<HTMLButtonElement>) {
    if (snapshot.loading) return;
    // Keyboard readers continue with the newly revealed posts; pointer clicks keep their place.
    focusAfterLoad.current = { count: snapshot.posts.length, keyboard: event.detail === 0 };
    void pager.current?.loadMore();
  }

  return (
    <section id="news" aria-labelledby="news-title" className={`${styles.section} mx-auto max-w-[1400px] px-5 md:px-10 lg:px-16`}>
      <div className={styles.heading}>
        <p className="eyebrow section-label"><span className="accent-dot" aria-hidden="true" /> FROM THE BAND</p>
        <h2 id="news-title" className="section-title font-display uppercase">Latest news.</h2>
      </div>

      {snapshot.posts.length || snapshot.hasMore ? <>
        <div ref={viewport} className={styles.feedViewport} role="region" aria-label="Band news feed" tabIndex={0}>
          <ul ref={list} id="news-list" className={styles.feed} data-layout={snapshot.posts.length >= 3 ? "editorial" : "list"} aria-label="Latest posts from The Jim Atkinson Band">
            {snapshot.posts.map((post) => <li key={post.id} className={styles.item}><NewsPost post={post} /></li>)}
          </ul>
        </div>
        <div className={styles.bottom}>
          <div className={styles.more}>
            {snapshot.hasMore && <button ref={loadButton} type="button" className={styles.loadButton} onClick={loadFromButton} aria-controls="news-list" aria-disabled={snapshot.loading} aria-busy={snapshot.loading}>
              {snapshot.loading ? <span className={styles.loading}><span aria-hidden="true" /> Loading news</span> : <><span>{snapshot.error ? "Try again" : "More news"}</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" /></svg></>}
            </button>}
            {snapshot.error && <p className={styles.error}>Couldn’t load older posts. Please try again.</p>}
          </div>
          <p role="status" aria-live="polite" className="sr-only">{snapshot.loading ? "Loading more news." : snapshot.error ? "Couldn’t load more posts. Try again." : `${snapshot.posts.length} posts shown.`}</p>
          <a ref={followLink} href={band.facebook} target="_blank" rel="noopener noreferrer">More on Facebook<Icon name="arrowUpRight" size={15} /><span className="sr-only"> (opens in a new tab)</span></a>
        </div>
      </> : <a className={styles.fallback} href={band.facebook} target="_blank" rel="noopener noreferrer">Catch up with the band on Facebook<Icon name="arrowUpRight" size={18} /><span className="sr-only"> (opens in a new tab)</span></a>}
    </section>
  );
}
