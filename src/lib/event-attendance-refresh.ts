export type EventAttendance = {
  attendingCount: number | null;
  interestedCount: number | null;
};
export type AttendanceSnapshot = Record<string, EventAttendance>;

type RefreshEnvironment = {
  fetcher?: typeof fetch;
  page?: Pick<Document, "visibilityState" | "addEventListener" | "removeEventListener">;
  view?: Pick<Window, "addEventListener" | "removeEventListener">;
  now?: () => number;
  schedule?: (callback: () => void, delay: number) => () => void;
};

function parseSnapshot(body: unknown): AttendanceSnapshot {
  if (!body || typeof body !== "object" || !("events" in body) || !Array.isArray(body.events)
    || body.events.length > 150) throw new Error("Invalid attendance response");
  const counts: AttendanceSnapshot = {};
  const validCount = (value: unknown) => value === null
    || (typeof value === "number" && Number.isSafeInteger(value) && value >= 0);
  for (const event of body.events) {
    if (!event || typeof event !== "object" || typeof event.id !== "string" || !/^\d{1,32}$/.test(event.id)
      || !validCount(event.attendingCount) || !validCount(event.interestedCount)) {
      throw new Error("Invalid attendance response");
    }
    counts[event.id] = { attendingCount: event.attendingCount, interestedCount: event.interestedCount };
  }
  return counts;
}

// One watcher per provider, shared by every event. The schedule and document are
// injectable so background-tab and Safari return behavior can be tested.
export function watchEventAttendance(onUpdate: (counts: AttendanceSnapshot) => void, {
  fetcher = fetch,
  page = document,
  view = window,
  now = Date.now,
  schedule = (callback, delay) => {
    const timer = setInterval(callback, delay);
    return () => clearInterval(timer);
  },
}: RefreshEnvironment = {}): () => void {
  let disposed = false;
  let request: AbortController | null = null;
  let cancelPolling: (() => void) | null = null;
  let lastAttempt = -Infinity;

  async function refresh() {
    if (disposed || page.visibilityState !== "visible" || request || now() - lastAttempt < 2_000) return;
    lastAttempt = now();
    const controller = new AbortController();
    request = controller;
    const timeout = setTimeout(() => controller.abort(), 25_000);
    try {
      const response = await fetcher("/api/events/attendance", {
        cache: "no-store",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) return;
      const counts = parseSnapshot(await response.json());
      if (!disposed && !controller.signal.aborted) onUpdate(counts);
    } catch {
      // Keep the last known counts during temporary network or Graph failures.
    } finally {
      clearTimeout(timeout);
      request = null;
    }
  }

  const onReturn = () => { void refresh(); };
  function onVisibility() {
    cancelPolling?.();
    cancelPolling = null;
    if (page.visibilityState === "visible") {
      void refresh();
      cancelPolling = schedule(onReturn, 60_000);
    }
  }

  page.addEventListener("visibilitychange", onVisibility);
  view.addEventListener("focus", onReturn);
  view.addEventListener("pageshow", onReturn);
  onVisibility();

  return () => {
    disposed = true;
    cancelPolling?.();
    request?.abort();
    page.removeEventListener("visibilitychange", onVisibility);
    view.removeEventListener("focus", onReturn);
    view.removeEventListener("pageshow", onReturn);
  };
}
