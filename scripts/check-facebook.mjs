import { pathToFileURL } from "node:url";

const DEFAULT_PAGE_ID = "1813541058730407";
const BASIC_FIELDS = "id,message,created_time,permalink_url,is_published";
const FULL_FIELDS = `${BASIC_FIELDS},full_picture,status_type,attachments{type,title,description,url,target,media,subattachments}`;
const PUBLIC_FIELDS = ["id", "message", "created_time", "permalink_url", "is_published", "full_picture", "status_type", "attachments"];
const EVENT_FIELDS = "id,name,start_time,end_time,place,cover,description";

function diagnosis(status, code) {
  if (code === 190) return "invalid_expired_or_wrong_token_type";
  if (status === 429 || code === 4 || code === 17 || code === 32 || code === 613) return "rate_limited";
  if (code === 10 || code === 200) return "permission_or_page_access_required";
  if (code === 100) return "object_field_or_access_unavailable";
  return "graph_request_failed";
}

function eventIdFromUrl(value) {
  try {
    const url = new URL(value);
    if (url.hostname !== "facebook.com" && !url.hostname.endsWith(".facebook.com")) return null;
    return url.pathname.match(/^\/events\/(?:[^/]+\/)?(\d+)(?:\/|$)/)?.[1] ?? null;
  } catch {
    return null;
  }
}

function normalizePost(post, cleanText, cleanUrl) {
  const attachments = [];
  const queue = Array.isArray(post.attachments?.data) ? [...post.attachments.data] : [];
  // Bound output even for posts containing many album images or nested attachments.
  for (let index = 0; index < queue.length && index < 12; index += 1) {
    const item = queue[index];
    if (!item || typeof item !== "object") continue;
    const type = cleanText(item.type, 80);
    const url = cleanUrl(item.url ?? item.target?.url);
    const targetUrl = cleanUrl(item.target?.url);
    const targetId = /^\d+$/.test(String(item.target?.id ?? "")) ? String(item.target.id) : null;
    attachments.push({
      type,
      title: cleanText(item.title, 180),
      description: cleanText(item.description, 300),
      url,
      targetUrl,
      targetId,
      imageUrl: cleanUrl(item.media?.image?.src),
      eventId: eventIdFromUrl(url) ?? eventIdFromUrl(targetUrl) ?? (type === "event" ? targetId : null),
    });
    if (Array.isArray(item.subattachments?.data)) queue.push(...item.subattachments.data.slice(0, 12));
  }

  const eventEvidence = [];
  const captionEventId = typeof post.message === "string"
    ? [...post.message.matchAll(/https?:\/\/[^\s<>"']+/g)].map(([url]) => eventIdFromUrl(url)).find(Boolean)
    : null;
  if (post.status_type === "created_event") eventEvidence.push("created_event");
  if (attachments.some((item) => item.type === "event")) eventEvidence.push("event_attachment");
  if (captionEventId || attachments.some((item) => eventIdFromUrl(item.url) || eventIdFromUrl(item.targetUrl))) eventEvidence.push("facebook_event_url");
  const fieldAvailability = Object.fromEntries(PUBLIC_FIELDS.map((field) => [
    field,
    !Object.hasOwn(post, field) ? "not_returned" : post[field] == null ? "null" : "present",
  ]));

  return {
    postId: cleanText(post.id, 100),
    publicationStatus: post.is_published === true ? "published" : "not_returned",
    publishedAt: cleanText(post.created_time, 80),
    message: cleanText(post.message, 600),
    permalink: cleanUrl(post.permalink_url),
    imageUrl: cleanUrl(post.full_picture),
    statusType: cleanText(post.status_type, 80),
    attachments,
    eventEvidence,
    eventId: attachments.find((item) => item.eventId)?.eventId ?? captionEventId ?? null,
    // A post's publication time and attachment text do not verify a show's date.
    eventStartsAt: null,
    eventEndsAt: null,
    fieldAvailability,
  };
}

function normalizeEvent(event, cleanText, cleanUrl, now) {
  const startsAt = cleanText(event.start_time, 80);
  const endsAt = cleanText(event.end_time, 80);
  const parseTime = (value) => typeof value === "string" && /(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ? Date.parse(value) : NaN;
  const start = parseTime(startsAt);
  const end = parseTime(endsAt);
  let temporalStatus = "unknown";
  if (Number.isFinite(start) && (!Number.isFinite(end) || end >= start)) {
    if (start > now) temporalStatus = "upcoming";
    else if (Number.isFinite(end)) temporalStatus = end <= now ? "past" : "ongoing";
  }
  const place = event.place && typeof event.place === "object" ? event.place : null;
  const location = place?.location && typeof place.location === "object" ? place.location : null;

  return {
    eventId: event.id,
    name: cleanText(event.name, 180),
    url: `https://www.facebook.com/events/${event.id}/`,
    startsAt,
    endsAt,
    dateSource: "facebook_events_api",
    temporalStatus,
    place: place ? {
      id: cleanText(place.id, 100),
      name: cleanText(place.name, 180),
      location: location ? Object.fromEntries(["street", "city", "state", "zip", "country"].map((field) => [field, cleanText(location[field], 180)])) : null,
    } : null,
    coverUrl: cleanUrl(event.cover?.source),
    description: cleanText(event.description, 600),
    fieldAvailability: Object.fromEntries(EVENT_FIELDS.split(",").map((field) => [
      field,
      !Object.hasOwn(event, field) ? "not_returned" : event[field] == null ? "null" : "present",
    ])),
  };
}

export async function checkFacebook({ env = process.env, fetchImpl = globalThis.fetch, write = console.log, now = Date.now() } = {}) {
  const token = env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim();
  const pageId = env.FACEBOOK_PAGE_ID?.trim() || DEFAULT_PAGE_ID;
  const version = env.FACEBOOK_GRAPH_VERSION?.trim() || "v26.0";
  const emit = (record) => write(JSON.stringify(record));

  if (!token || !/^\d+$/.test(pageId) || !/^v\d+\.\d+$/.test(version)) {
    emit({
      check: "configuration",
      ok: false,
      message: !token
        ? "Set FACEBOOK_PAGE_ACCESS_TOKEN privately in the root .env.local; never use NEXT_PUBLIC_ for this token."
        : "FACEBOOK_PAGE_ID must be numeric and FACEBOOK_GRAPH_VERSION must look like v26.0.",
    });
    return 2;
  }

  function cleanText(value, maxLength = 600) {
    if (typeof value !== "string") return null;
    return value
      .replaceAll(token, "[REDACTED]")
      .replaceAll(encodeURIComponent(token), "[REDACTED]")
      .replace(/([?&](?:access_token|appsecret_proof|client_secret|token)=)[^&#\s]+/gi, "$1[REDACTED]")
      .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
      .slice(0, maxLength);
  }

  function cleanUrl(value) {
    if (typeof value !== "string") return null;
    try {
      const url = new URL(value);
      if (!["https:", "http:"].includes(url.protocol)) return null;
      url.username = "";
      url.password = "";
      for (const key of [...url.searchParams.keys()]) {
        if (/^(access_token|appsecret_proof|client_secret|token|code)$/i.test(key)) url.searchParams.delete(key);
      }
      return cleanText(url.href, 1500);
    } catch {
      return null;
    }
  }

  async function read(path, fields, limit) {
    const url = new URL(`https://graph.facebook.com/${version}/${path}`);
    url.searchParams.set("fields", fields);
    if (limit) url.searchParams.set("limit", String(limit));
    try {
      const response = await fetchImpl(url.href, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
      });
      let body;
      try {
        body = await response.json();
      } catch (error) {
        return { ok: false, reason: ["TimeoutError", "AbortError"].includes(error?.name) ? "request_timeout" : "non_json_response", httpStatus: response.status };
      }
      if (!response.ok || body?.error) {
        const code = Number.isInteger(body?.error?.code) ? body.error.code : null;
        const subcode = Number.isInteger(body?.error?.error_subcode) ? body.error.error_subcode : null;
        return { ok: false, reason: diagnosis(response.status, code), httpStatus: response.status, code, subcode };
      }
      return { ok: true, body };
    } catch (error) {
      return { ok: false, reason: ["TimeoutError", "AbortError"].includes(error?.name) ? "request_timeout" : "network_request_failed" };
    }
  }

  const page = await read(pageId, "id,name");
  if (!page.ok) {
    emit({ check: "page", ...page });
    return 1;
  }
  if (String(page.body?.id) !== pageId || typeof page.body?.name !== "string") {
    emit({ check: "page", ok: false, reason: String(page.body?.id) !== pageId ? "page_id_mismatch" : "unexpected_response" });
    return 1;
  }
  emit({ check: "page", ok: true, pageId, name: cleanText(page.body.name, 180), graphVersion: version });

  async function checkPosts() {
    let mode = "full";
    let result = await read(`${pageId}/posts`, FULL_FIELDS, 10);
    if (!result.ok && [10, 100, 200].includes(result.code)) {
      emit({ check: "extended_fields", ...result, message: "Retrying basic fields once; this failure alone does not establish which field, permission, or endpoint was unavailable." });
      mode = "basic";
      result = await read(`${pageId}/posts`, BASIC_FIELDS, 10);
    }
    if (!result.ok) {
      emit({ check: "posts", ...result });
      return 1;
    }
    if (!Array.isArray(result.body?.data)) {
      emit({ check: "posts", ok: false, reason: "unexpected_response" });
      return 1;
    }

    const rows = result.body.data.slice(0, 10);
    const counts = { received: rows.length, published: 0, unpublished: 0, publicationUnknown: 0, duplicates: 0 };
    const posts = [];
    const seen = new Set();
    for (const post of rows) {
      if (!post || typeof post !== "object" || typeof post.id !== "string") {
        emit({ check: "posts", ok: false, reason: "unexpected_response" });
        return 1;
      }
      if (seen.has(post.id)) { counts.duplicates += 1; continue; }
      seen.add(post.id);
      if (post.is_published === false) { counts.unpublished += 1; continue; }
      if (post.is_published === true) counts.published += 1;
      else counts.publicationUnknown += 1;
      posts.push(normalizePost(post, cleanText, cleanUrl));
    }

    emit({
      check: "posts",
      ok: true,
      mode,
      outcome: rows.length ? "visible_posts_returned" : "no_visible_posts",
      eventAttachmentRead: mode === "full" && posts.some((post) => post.fieldAvailability.attachments === "present") ? "returned" : "not_validated",
      counts,
      posts,
      note: "One page of results only. Missing fields or an empty result do not prove there are no events. Publication times are not show dates; post evidence does not validate the Events endpoint or a complete history.",
    });
    return 0;
  }

  async function checkEvents() {
    const result = await read(`${pageId}/events`, EVENT_FIELDS, 10);
    if (!result.ok) {
      emit({ check: "events", ...result });
      return 1;
    }
    if (!Array.isArray(result.body?.data)) {
      emit({ check: "events", ok: false, reason: "unexpected_response" });
      return 1;
    }

    const rows = result.body.data.slice(0, 10);
    const counts = { received: rows.length, upcoming: 0, past: 0, ongoing: 0, unknownTiming: 0, duplicates: 0 };
    const events = [];
    const seen = new Set();
    for (const event of rows) {
      if (!event || typeof event !== "object" || typeof event.id !== "string" || !/^\d+$/.test(event.id)) {
        emit({ check: "events", ok: false, reason: "unexpected_response" });
        return 1;
      }
      if (seen.has(event.id)) { counts.duplicates += 1; continue; }
      seen.add(event.id);
      const normalized = normalizeEvent(event, cleanText, cleanUrl, now);
      counts[normalized.temporalStatus === "unknown" ? "unknownTiming" : normalized.temporalStatus] += 1;
      events.push(normalized);
    }

    emit({
      check: "events",
      ok: true,
      outcome: rows.length ? "visible_events_returned" : "no_visible_events",
      checkedAt: new Date(now).toISOString(),
      counts,
      events,
      note: "First page only, at most ten events; this does not establish a complete archive. Dates and offsets come directly from the Events response. Missing dates are not inferred from descriptions or posts.",
    });
    return 0;
  }

  // Independent results: a post permission/token-type error must not skip Events.
  const postsExit = await checkPosts();
  const eventsExit = await checkEvents();
  emit({ check: "summary", ok: postsExit === 0 && eventsExit === 0, postsRead: postsExit === 0, eventsRead: eventsExit === 0 });
  return Math.max(postsExit, eventsExit);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await checkFacebook();
}
