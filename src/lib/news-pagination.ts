import type { BandPost, BandPostsPage } from "./facebook-posts";

export type NewsSnapshot = {
  posts: BandPost[];
  nextCursor: string | null;
  hasMore: boolean;
  loading: boolean;
  error: boolean;
};

type NewsPagerOptions = {
  initial: BandPostsPage;
  fetchPage: (cursor: string, signal: AbortSignal) => Promise<BandPostsPage>;
  onChange: (snapshot: NewsSnapshot) => void;
  batchSize?: number;
};

function visibleBatchSize(size: number): number {
  return Number.isSafeInteger(size) && size > 0 ? size : 3;
}

export function getInitialNewsSnapshot(initial: BandPostsPage, batchSize = 3): NewsSnapshot {
  const size = visibleBatchSize(batchSize);
  return {
    posts: initial.posts.slice(0, size),
    nextCursor: initial.nextCursor,
    hasMore: initial.posts.length > size || initial.nextCursor !== null,
    loading: false,
    error: initial.status !== "connected",
  };
}

// Keep the server's first page and subsequent Graph pages buffered, revealing a
// small batch only when the reader deliberately asks for more news.
export function createNewsPager({ initial, fetchPage, onChange, batchSize = 3 }: NewsPagerOptions): {
  loadMore: () => Promise<void>;
  cancel: () => void;
} {
  const size = visibleBatchSize(batchSize);
  let snapshot = getInitialNewsSnapshot(initial, size);
  const buffered = initial.posts.slice(size);
  const seenIds = new Set(initial.posts.map(({ id }) => id));
  const consumedCursors = new Set<string>();
  let disposed = false;
  let request: AbortController | null = null;
  let inFlight: Promise<void> | null = null;

  function loadMore(): Promise<void> {
    if (inFlight) return inFlight;
    if (disposed || !snapshot.hasMore) return Promise.resolve();

    if (buffered.length) {
      inFlight = Promise.resolve().then(() => {
        if (disposed) return;
        const added = buffered.splice(0, size);
        snapshot = {
          ...snapshot,
          posts: [...snapshot.posts, ...added],
          hasMore: buffered.length > 0 || snapshot.nextCursor !== null,
          loading: false,
          error: false,
        };
        onChange(snapshot);
      }).finally(() => { inFlight = null; });
      return inFlight;
    }

    const cursor = snapshot.nextCursor;
    if (!cursor) return Promise.resolve();
    const controller = new AbortController();
    request = controller;
    snapshot = { ...snapshot, loading: true, error: false };

    inFlight = Promise.resolve().then(async () => {
      if (disposed) return;
      try {
        const page = await fetchPage(cursor, controller.signal);
        if (disposed || controller.signal.aborted) return;
        if (page.status !== "connected") throw new Error("News is temporarily unavailable");

        const added: BandPost[] = [];
        for (const post of page.posts) {
          if (!seenIds.has(post.id)) {
            seenIds.add(post.id);
            added.push(post);
          }
        }
        consumedCursors.add(cursor);
        const nextCursor = page.nextCursor && !consumedCursors.has(page.nextCursor)
          ? page.nextCursor : null;
        buffered.push(...added);
        snapshot = {
          posts: [...snapshot.posts, ...buffered.splice(0, size)],
          nextCursor,
          hasMore: buffered.length > 0 || nextCursor !== null,
          loading: false,
          error: false,
        };
      } catch {
        if (disposed || controller.signal.aborted) return;
        // Keep the cursor unconsumed so a deliberate retry requests this page.
        snapshot = { ...snapshot, loading: false, error: true };
      }
      onChange(snapshot);
    }).finally(() => {
      request = null;
      inFlight = null;
    });

    onChange(snapshot);
    return inFlight;
  }

  return {
    loadMore,
    cancel() {
      disposed = true;
      request?.abort();
    },
  };
}
