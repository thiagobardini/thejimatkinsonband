import type { BandPost, BandPostsPage } from "./facebook-posts";

export type NewsSnapshot = {
  posts: BandPost[];
  nextCursor: string | null;
  loading: boolean;
  error: boolean;
};

type NewsPagerOptions = {
  initial: BandPostsPage;
  fetchPage: (cursor: string, signal: AbortSignal) => Promise<BandPostsPage>;
  onChange: (snapshot: NewsSnapshot) => void;
};

// The server supplies the first page. This controller requests another page only
// when the rail's observer or its accessible fallback asks for one.
export function createNewsPager({ initial, fetchPage, onChange }: NewsPagerOptions): {
  loadMore: () => Promise<void>;
  cancel: () => void;
} {
  let snapshot: NewsSnapshot = {
    posts: [...initial.posts],
    nextCursor: initial.nextCursor,
    loading: false,
    error: initial.status !== "connected",
  };
  const seenIds = new Set(snapshot.posts.map(({ id }) => id));
  const consumedCursors = new Set<string>();
  let disposed = false;
  let request: AbortController | null = null;
  let inFlight: Promise<void> | null = null;

  function loadMore(): Promise<void> {
    if (inFlight) return inFlight;
    if (disposed || !snapshot.nextCursor) return Promise.resolve();

    const cursor = snapshot.nextCursor;
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
        snapshot = {
          posts: [...snapshot.posts, ...added],
          nextCursor,
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
