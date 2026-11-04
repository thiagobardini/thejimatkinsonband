"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BandPost, BandPostsPage } from "@/lib/facebook-posts";
import { createNewsPager, type NewsSnapshot } from "@/lib/news-pagination";
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

function NewsImage({ post }: { post: BandPost }) {
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const checkCached = useCallback((image: HTMLImageElement | null) => {
    if (image?.complete) setStatus(image.naturalWidth ? "ready" : "failed");
  }, []);
  if (!post.imageUrl || status === "failed") return null;
  return (
    <a className={styles.image} data-loading={status === "loading"} href={post.permalink} target="_blank" rel="noopener noreferrer"
      aria-label={`View the band's photo from ${postDate.format(new Date(post.publishedAt))} on Facebook (opens in a new tab)`}>
      {status === "loading" && <span className={styles.imageLoading} aria-hidden="true"><span /></span>}
      {/* Facebook's signed images must not sit in the image optimizer's longer-lived cache. */}
      <img ref={checkCached} src={post.imageUrl} alt={post.attachmentTitle || "Photo shared by The Jim Atkinson Band"}
        width={1200} height={800} loading="lazy" decoding="async" referrerPolicy="no-referrer"
        onLoad={() => setStatus("ready")} onError={() => setStatus("failed")} />
      {post.kind === "video" && <span className={styles.videoLabel}><Icon name="play" size={14} /> Watch on Facebook</span>}
    </a>
  );
}

function NewsPost({ post }: { post: BandPost }) {
  const [expanded, setExpanded] = useState(false);
  // Shared-link URLs belong in the original post; the attachment supplies their readable preview.
  const message = post.message?.replace(/https?:\/\/[^\s]+/g, "").trim();
  const copy = message || post.attachmentDescription || post.attachmentTitle || post.message;
  const title = message && post.attachmentTitle && !message.includes(post.attachmentTitle) ? post.attachmentTitle : null;
  const long = (copy?.length ?? 0) > 250;
  return (
    <article className={styles.post} data-image={Boolean(post.imageUrl)}>
      <div className={styles.meta}>
        <time dateTime={post.publishedAt}>{postDate.format(new Date(post.publishedAt))}</time>
        <span>{post.kind === "photo" ? "PHOTO" : post.kind === "video" ? "VIDEO" : post.kind === "link" ? "SHARED" : "A NOTE FROM THE BAND"}</span>
      </div>
      {post.imageUrl && <NewsImage key={post.imageUrl} post={post} />}
      <div className={styles.copy}>
        {title && <p className={styles.attachmentTitle}>{title}</p>}
        {copy && <p className={styles.message} data-expanded={expanded || !long}>{copy}</p>}
        {long && <button type="button" className={styles.expand} onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
          {expanded ? "Show less" : "Read more"}
        </button>}
      </div>
      <a className={styles.postLink} data-news-post-link href={post.permalink} target="_blank" rel="noopener noreferrer">
        <span>View post</span><Icon name="arrowUpRight" size={16} />
        <span className="sr-only"> on Facebook, {postDate.format(new Date(post.publishedAt))} (opens in a new tab)</span>
      </a>
    </article>
  );
}

function RailArrow({ direction }: { direction: "previous" | "next" }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d={direction === "next" ? "M4 12h16m-6-6 6 6-6 6" : "M20 12H4m6-6-6 6 6 6"} stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

export function NewsFeed({ initial }: { initial: BandPostsPage }) {
  const [snapshot, setSnapshot] = useState<NewsSnapshot>({ posts: initial.posts, nextCursor: initial.nextCursor, loading: false, error: false });
  const [visible, setVisible] = useState(false);
  const [scrollable, setScrollable] = useState({ previous: false, next: initial.posts.length > 1 });
  const section = useRef<HTMLElement>(null);
  const rail = useRef<HTMLUListElement>(null);
  const sentinel = useRef<HTMLLIElement>(null);
  const loadButton = useRef<HTMLButtonElement>(null);
  const followLink = useRef<HTMLAnchorElement>(null);
  const focusAfterLoad = useRef<number | null>(null);
  const pager = useRef<ReturnType<typeof createNewsPager> | null>(null);

  useEffect(() => {
    const controller = createNewsPager({ initial, fetchPage, onChange: setSnapshot });
    pager.current = controller;
    return () => { controller.cancel(); pager.current = null; };
  }, [initial]);

  useEffect(() => {
    const element = section.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: "100px 0px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !snapshot.nextCursor || snapshot.error || !rail.current || !sentinel.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) void pager.current?.loadMore();
    }, { root: rail.current, rootMargin: "0px 180px 0px 0px", threshold: 0.01 });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [visible, snapshot.nextCursor, snapshot.error]);

  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const update = () => setScrollable({ previous: element.scrollLeft > 4, next: element.scrollLeft + element.clientWidth < element.scrollWidth - 4 });
    update();
    element.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => { element.removeEventListener("scroll", update); observer.disconnect(); };
  }, [snapshot.posts.length, snapshot.nextCursor]);

  useEffect(() => {
    const previousLength = focusAfterLoad.current;
    if (snapshot.loading || previousLength === null) return;
    focusAfterLoad.current = null;
    if (document.activeElement !== loadButton.current && document.activeElement !== document.body) return;
    const nextPost = rail.current?.querySelectorAll<HTMLLIElement>(`li.${styles.item}`)[previousLength];
    const target = nextPost?.querySelector<HTMLAnchorElement>("[data-news-post-link]") || loadButton.current || followLink.current;
    target?.focus({ preventScroll: true });
    nextPost?.scrollIntoView({ block: "nearest", inline: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [snapshot.loading, snapshot.posts.length]);

  function loadFromButton() {
    if (snapshot.loading) return;
    if (document.activeElement === loadButton.current) focusAfterLoad.current = snapshot.posts.length;
    void pager.current?.loadMore();
  }

  const move = (direction: number) => {
    const element = rail.current;
    if (!element) return;
    const first = element.querySelector("li");
    const distance = first ? first.getBoundingClientRect().width + (parseFloat(getComputedStyle(element).columnGap) || 0) : element.clientWidth * .85;
    element.scrollBy({ left: distance * direction, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  return (
    <section ref={section} id="news" aria-labelledby="news-title" className={`${styles.section} mx-auto max-w-[1400px] px-5 md:px-10 lg:px-16`}>
      <div className={styles.heading}>
        <div>
          <p className="eyebrow section-label"><span className="accent-dot" aria-hidden="true" /> FROM THE BAND</p>
          <h2 id="news-title" className="section-title font-display uppercase">Latest news.</h2>
          <p className={styles.intro}>On stage, off stage, and everything in between.</p>
        </div>
        {snapshot.posts.length > 0 && <div className={styles.controls} role="group" aria-label="Browse latest news">
          <button type="button" onClick={() => move(-1)} disabled={!scrollable.previous} aria-label="Previous news" aria-controls="news-list"><RailArrow direction="previous" /></button>
          <button type="button" onClick={() => move(1)} disabled={!scrollable.next} aria-label="Next news" aria-controls="news-list"><RailArrow direction="next" /></button>
        </div>}
      </div>

      {snapshot.posts.length || snapshot.nextCursor ? <>
        <ul ref={rail} id="news-list" className={styles.rail} tabIndex={0} aria-label="Latest posts from The Jim Atkinson Band" onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault(); move(event.key === "ArrowLeft" ? -1 : 1);
          } else if (event.key === "Home" || event.key === "End") {
            event.preventDefault(); rail.current?.scrollTo({ left: event.key === "Home" ? 0 : rail.current.scrollWidth, behavior: "auto" });
          }
        }}>
          {snapshot.posts.map((post) => <li key={post.id} className={styles.item}><NewsPost post={post} /></li>)}
          {snapshot.nextCursor && <li ref={sentinel} className={styles.more}>
            <p>{snapshot.error ? "Couldn’t load the next posts." : "A little further back."}</p>
            <button ref={loadButton} type="button" className={styles.loadButton} onClick={loadFromButton} aria-disabled={snapshot.loading} aria-busy={snapshot.loading}>
              {snapshot.loading ? <span className={styles.loading}><span aria-hidden="true" /> Loading more news</span> : <>{snapshot.error ? "Try again" : "Load more news"}<RailArrow direction="next" /></>}
            </button>
          </li>}
        </ul>
        <div className={styles.bottom}>
          <p role="status" aria-live="polite" className={styles.status}>{snapshot.loading ? "Bringing in more from the band…" : snapshot.error ? "Your news is still here. Try loading more again." : snapshot.nextCursor ? "Explore a little further. More stories load as you go." : "You’re all caught up."}</p>
          <a ref={followLink} href={band.facebook} target="_blank" rel="noopener noreferrer">Follow along on Facebook<Icon name="arrowUpRight" size={15} /><span className="sr-only"> (opens in a new tab)</span></a>
        </div>
      </> : <a className={styles.fallback} href={band.facebook} target="_blank" rel="noopener noreferrer">Catch up with the band on Facebook<Icon name="arrowUpRight" size={18} /><span className="sr-only"> (opens in a new tab)</span></a>}
    </section>
  );
}
