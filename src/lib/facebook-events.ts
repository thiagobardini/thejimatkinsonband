export type BandEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  venue: string | null;
  location: string | null;
  coverUrl: string | null;
  eventUrl: string;
  attendingCount: number | null;
  interestedCount: number | null;
};

export type BandEventsResult = {
  status: "connected" | "unavailable" | "unconfigured";
  events: BandEvent[];
};

export const DEFAULT_FACEBOOK_PAGE_ID = "1813541058730407";
const EVENT_FIELDS = "id,name,start_time,end_time,place,cover,description";
const OPTIONAL_EVENT_FIELDS = ["is_canceled", "attending_count", "interested_count"];
const MAX_PAGES = 3;
const PAGE_SIZE = 50;
const easternDate = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
});

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function text(value: unknown, maxLength = 240): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[\u0000-\u001f\u007f-\u009f]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

function responseCount(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function apiDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})$/);
  if (!match) return null;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText = "0"] = match;
  const [year, month, day, hour, minute, second] = [yearText, monthText, dayText, hourText, minuteText, secondText].map(Number);
  const leapYear = year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
  const monthDays = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > monthDays[month - 1] || hour > 23 || minute > 59 || second > 59) return null;
  return Number.isFinite(Date.parse(value)) ? value : null;
}

function coverUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    for (const key of [...url.searchParams.keys()]) {
      if (/^(access_token|appsecret_proof|client_secret|fb_exchange_token|token)$/i.test(key)) url.searchParams.delete(key);
    }
    return url.href;
  } catch {
    return null;
  }
}

export function normalizeFacebookEvent(value: unknown): BandEvent | null {
  const event = record(value);
  if (!event || typeof event.id !== "string" || !/^\d{1,32}$/.test(event.id)) return null;
  if (event.is_canceled === true || (event.is_canceled != null && typeof event.is_canceled !== "boolean")) return null;
  const title = text(event.name);
  const startsAt = apiDate(event.start_time);
  const endsAt = event.end_time == null ? null : apiDate(event.end_time);
  if (!title || !startsAt || (event.end_time != null && !endsAt)) return null;
  if (endsAt && Date.parse(endsAt) < Date.parse(startsAt)) return null;
  const place = record(event.place);
  const location = record(place?.location);
  const cityState = [text(location?.city), text(location?.state)].filter(Boolean).join(", ");
  const locationLabel = cityState || [text(location?.street), text(location?.country)].filter(Boolean).join(", ");
  return {
    id: event.id,
    title,
    startsAt,
    endsAt,
    venue: text(place?.name),
    location: locationLabel || null,
    coverUrl: coverUrl(record(event.cover)?.source),
    eventUrl: `https://www.facebook.com/events/${event.id}/`,
    attendingCount: responseCount(event.attending_count),
    interestedCount: responseCount(event.interested_count),
  };
}

function calendarDay(timestamp: number): string {
  const parts = easternDate.formatToParts(timestamp);
  return ["year", "month", "day"].map((type) => parts.find((part) => part.type === type)?.value).join("-");
}

function ascending(left: BandEvent, right: BandEvent): number {
  return Date.parse(left.startsAt) - Date.parse(right.startsAt) || left.id.localeCompare(right.id);
}

export function partitionEvents(events: readonly BandEvent[], now = Date.now()): { upcoming: BandEvent[]; past: BandEvent[] } {
  const upcoming: BandEvent[] = [];
  const past: BandEvent[] = [];
  const today = calendarDay(now);
  for (const event of events) {
    const start = Date.parse(event.startsAt);
    if (!Number.isFinite(start)) continue;
    const ended = event.endsAt !== null
      ? Date.parse(event.endsAt) <= now
      : calendarDay(start) < today;
    (ended ? past : upcoming).push(event);
  }
  return { upcoming: upcoming.sort(ascending), past: past.sort((left, right) => ascending(right, left)) };
}

type FacebookRequestInit = RequestInit & { next: { revalidate: number } };
type FacebookFetcher = (url: string, init: FacebookRequestInit) => Promise<Pick<Response, "ok" | "json">>;
type FacebookReadOptions = {
  token?: string;
  pageId?: string;
  graphVersion?: string;
  fetcher?: FacebookFetcher;
};

function unsupportedOptionalField(value: unknown, fields: ReadonlySet<string>): string | null {
  const error = record(value);
  if (error?.code !== 100 || typeof error.message !== "string") return null;
  for (const field of fields) {
    const name = `(?:\\(\\s*${field}\\s*\\)|["']${field}["']|${field}(?![\\w]))`;
    const unsupported = new RegExp(`(?:nonexisting|nonexistent|unknown|unsupported)\\s+field\\b\\s*:?\\s*${name}|cannot\\s+query\\s+field\\b\\s*:?\\s*${name}|field\\b\\s*:?\\s*${name}\\s+(?:does\\s+not\\s+exist|is\\s+(?:unknown|unsupported|not\\s+supported))`, "i");
    if (unsupported.test(error.message)) return field;
  }
  return null;
}

export async function readFacebookEvents({ token: suppliedToken, pageId = DEFAULT_FACEBOOK_PAGE_ID, graphVersion = "v26.0", fetcher = fetch }: FacebookReadOptions = {}): Promise<BandEventsResult> {
  const token = suppliedToken?.trim();
  if (!token) return { status: "unconfigured", events: [] };
  if (!/^\d{1,32}$/.test(pageId) || !/^v\d+\.\d+$/.test(graphVersion)) return { status: "unavailable", events: [] };

  let after: string | null = null;
  const optionalFields = new Set(OPTIONAL_EVENT_FIELDS);
  const seenCursors = new Set<string>();
  const rawEvents = new Map<string, unknown>();
  let malformedRecords = 0;

  async function readPage() {
    const url = new URL(`https://graph.facebook.com/${graphVersion}/${pageId}/events`);
    url.searchParams.set("fields", [EVENT_FIELDS, ...optionalFields].join(","));
    url.searchParams.set("limit", String(PAGE_SIZE));
    if (after !== null) url.searchParams.set("after", after);
    const response = await fetcher(url.href, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      redirect: "error",
      cache: "force-cache",
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(15_000),
    });
    // The fetch signal remains active while the body is consumed.
    const body = record(await response.json());
    return { ok: response.ok, body };
  }

  try {
    for (let page = 0; page < MAX_PAGES; page += 1) {
      let response = await readPage();
      let unsupportedField = unsupportedOptionalField(response.body?.error, optionalFields);
      while (unsupportedField !== null) {
        // Each optional field can trigger only one retry across the entire read.
        optionalFields.delete(unsupportedField);
        response = await readPage();
        unsupportedField = unsupportedOptionalField(response.body?.error, optionalFields);
      }
      if (!response.ok || !response.body || response.body.error || !Array.isArray(response.body.data)) {
        return { status: "unavailable", events: [] };
      }
      for (const item of response.body.data.slice(0, PAGE_SIZE)) {
        const event = record(item);
        if (!event || typeof event.id !== "string" || !/^\d{1,32}$/.test(event.id)) malformedRecords += 1;
        else rawEvents.set(event.id, item);
      }

      const paging = record(response.body.paging);
      if (paging?.next == null) break;
      const cursor = record(paging.cursors)?.after;
      if (typeof paging.next !== "string" || !paging.next || typeof cursor !== "string" || !cursor.trim()
        || cursor.length > 2048 || seenCursors.has(cursor) || cursor.includes(token)) {
        return { status: "unavailable", events: [] };
      }
      seenCursors.add(cursor);
      after = cursor;
      // Deliberately never follow or return paging.next (it may contain credentials).
    }

    const events: BandEvent[] = [];
    for (const raw of rawEvents.values()) {
      if (record(raw)?.is_canceled === true) continue;
      const normalized = normalizeFacebookEvent(raw);
      if (!normalized) { malformedRecords += 1; continue; }
      // Even a malformed upstream echo cannot forward our credential in a public field.
      const clean = Object.fromEntries(Object.entries(normalized).map(([key, value]) => [
        key,
        typeof value === "string" ? value.replaceAll(token, "[REDACTED]").replaceAll(encodeURIComponent(token), "[REDACTED]") : value,
      ])) as BandEvent;
      events.push(clean);
    }
    if (!events.length && malformedRecords) return { status: "unavailable", events: [] };
    return { status: "connected", events: events.sort(ascending) };
  } catch {
    // Never log or forward fetch errors, raw Graph bodies, tokens or pagination URLs.
    return { status: "unavailable", events: [] };
  }
}
