import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

const moduleUrl = new URL("../src/lib/facebook-events.ts", import.meta.url);
const token = "PRIVATE_FACEBOOK_TEST_TOKEN";
const pageId = "1813541058730407";
const rawEvent = {
  id: "952642270764299",
  name: " The Jim Atkinson Band at SSB Clinton ",
  start_time: "2026-11-21T18:00:00-0500",
  end_time: "2026-11-21T21:00:00-0500",
  place: { name: "SSB Clinton", location: { city: "Clinton", state: "Massachusetts" } },
  cover: { source: "https://scontent.example.com/event.jpg?size=large" },
  is_canceled: false,
  attending_count: 2,
  interested_count: 8,
};

async function api() {
  assert.ok(existsSync(moduleUrl), "Facebook events data module is not implemented yet");
  return import(moduleUrl.href);
}

function event(id, startsAt, endsAt = null) {
  return { id, title: `Show ${id}`, startsAt, endsAt, venue: null, location: null, coverUrl: null, eventUrl: `https://www.facebook.com/events/${id}/`, attendingCount: null, interestedCount: null };
}

function fakeFetch(fixtures, calls = []) {
  return async (url, init) => {
    calls.push({ url: new URL(url), init });
    assert.ok(fixtures.length, "Unexpected Graph request");
    const fixture = fixtures.shift();
    if (fixture instanceof Error) throw fixture;
    if (fixture.jsonError) return { ok: true, status: 200, json: async () => { throw fixture.jsonError; } };
    return new Response(JSON.stringify(fixture.body ?? fixture), { status: fixture.status ?? 200, headers: { "content-type": "application/json" } });
  };
}

test("normalizes only public display fields and preserves API offsets", async () => {
  const { normalizeFacebookEvent } = await api();
  assert.deepEqual(normalizeFacebookEvent({ ...rawEvent, access_token: token, description: token }), {
    id: "952642270764299",
    title: "The Jim Atkinson Band at SSB Clinton",
    startsAt: "2026-11-21T18:00:00-0500",
    endsAt: "2026-11-21T21:00:00-0500",
    venue: "SSB Clinton",
    location: "Clinton, Massachusetts",
    coverUrl: "https://scontent.example.com/event.jpg?size=large",
    eventUrl: "https://www.facebook.com/events/952642270764299/",
    attendingCount: 2,
    interestedCount: 8,
  });
});

test("drops canceled events and malformed identity, date, offset or end time", async () => {
  const { normalizeFacebookEvent } = await api();
  const invalid = [
    null,
    { ...rawEvent, id: "../events" },
    { ...rawEvent, name: " " },
    { ...rawEvent, is_canceled: true },
    { ...rawEvent, is_canceled: "true" },
    { ...rawEvent, start_time: "2026-11-21" },
    { ...rawEvent, start_time: "2026-11-21T18:00:00" },
    { ...rawEvent, start_time: "2026-02-30T18:00:00-0500" },
    { ...rawEvent, start_time: "2026-11-21T18:00:00+2500" },
    { ...rawEvent, end_time: "tomorrow" },
    { ...rawEvent, end_time: "2026-11-20T21:00:00-0500" },
  ];
  for (const value of invalid) assert.equal(normalizeFacebookEvent(value), null);
});

test("missing optional details stay nullable and unsafe cover URLs never reach the DTO", async () => {
  const { normalizeFacebookEvent } = await api();
  const minimal = { id: "123", name: "A show", start_time: "2026-11-21T18:00:00Z" };
  const normalized = normalizeFacebookEvent(minimal);
  assert.equal(normalized.endsAt, null);
  assert.equal(normalized.venue, null);
  assert.equal(normalized.location, null);
  assert.equal(normalized.coverUrl, null);
  assert.equal(normalized.attendingCount, null);
  assert.equal(normalized.interestedCount, null);
  assert.equal(normalizeFacebookEvent({ ...minimal, cover: { source: "javascript:alert(1)" } }).coverUrl, null);
  assert.equal(normalizeFacebookEvent({ ...minimal, cover: { source: "https://name:password@example.com/image.jpg" } }).coverUrl, null);
  assert.equal(normalizeFacebookEvent({ ...minimal, cover: { source: `https://example.com/image.jpg?access_token=${token}&size=small` } }).coverUrl, "https://example.com/image.jpg?size=small");
});

test("response counts preserve zero and accept only nonnegative safe integers", async () => {
  const { normalizeFacebookEvent } = await api();
  for (const [input, expected] of [
    [0, 0], [2, 2], [Number.MAX_SAFE_INTEGER, 9007199254740991],
    [undefined, null], [null, null], [-1, null], [1.5, null],
    [Number.MAX_SAFE_INTEGER + 1, null], [Infinity, null], [NaN, null],
    ["8", null], [false, null], [{ count: 8 }, null],
  ]) {
    const normalized = normalizeFacebookEvent({ ...rawEvent, attending_count: input, interested_count: input });
    assert.equal(normalized.attendingCount, expected);
    assert.equal(normalized.interestedCount, expected);
  }
});

test("partitions and sorts without mutation, keeping an overnight show until its end", async () => {
  const { partitionEvents } = await api();
  const rows = [
    event("3", "2026-11-21T18:00:00-0500", "2026-11-21T21:00:00-0500"),
    event("1", "2026-10-24T15:00:00-0400", "2026-10-24T18:00:00-0400"),
    event("4", "2026-10-26T23:00:00-0400", "2026-10-27T01:00:00-0400"),
    event("2", "2026-10-25T15:00:00-0400", "2026-10-25T18:00:00-0400"),
  ];
  const result = partitionEvents(rows, Date.parse("2026-10-27T00:30:00-0400"));
  assert.deepEqual(result.upcoming.map((item) => item.id), ["4", "3"]);
  assert.deepEqual(result.past.map((item) => item.id), ["2", "1"]);
  assert.deepEqual(rows.map((item) => item.id), ["3", "1", "4", "2"]);
  assert.deepEqual(partitionEvents([rows[2]], Date.parse("2026-10-27T01:00:00-0400")).past.map((item) => item.id), ["4"]);
});

test("missing end dates switch at Eastern midnight, including daylight-saving transitions", async () => {
  const { partitionEvents } = await api();
  for (const sample of [
    { start: "2026-10-26T18:00:00-0400", before: "2026-10-27T03:59:59Z", after: "2026-10-27T04:00:00Z" },
    { start: "2026-11-01T01:30:00-0400", before: "2026-11-02T04:59:59Z", after: "2026-11-02T05:00:00Z" },
    { start: "2026-03-08T01:30:00-0500", before: "2026-03-09T03:59:59Z", after: "2026-03-09T04:00:00Z" },
  ]) {
    const rows = [event("1", sample.start)];
    assert.equal(partitionEvents(rows, Date.parse(sample.before)).upcoming.length, 1);
    assert.equal(partitionEvents(rows, Date.parse(sample.after)).past.length, 1);
  }
});

test("missing credentials and invalid configuration perform no network calls", async () => {
  const { readFacebookEvents } = await api();
  const calls = [];
  assert.deepEqual(await readFacebookEvents({ fetcher: fakeFetch([], calls) }), { status: "unconfigured", events: [] });
  assert.deepEqual(await readFacebookEvents({ token, pageId: "../me", fetcher: fakeFetch([], calls) }), { status: "unavailable", events: [] });
  assert.equal(calls.length, 0);
});

test("follows only returned cursors on the trusted Graph endpoint with cached header-auth GETs", async () => {
  const { readFacebookEvents } = await api();
  const calls = [];
  const result = await readFacebookEvents({ token, fetcher: fakeFetch([
    { data: [rawEvent], paging: { next: `https://evil.example/steal?access_token=${token}`, cursors: { after: "cursor+one&two" } } },
    { data: [{ ...rawEvent, id: "123", name: "Earlier", start_time: "2026-10-24T15:00:00-0400", end_time: "2026-10-24T18:00:00-0400", attending_count: 0, interested_count: null }, rawEvent] },
  ], calls) });
  assert.equal(result.status, "connected");
  assert.deepEqual(result.events.map((item) => item.id), ["123", "952642270764299"]);
  assert.deepEqual(result.events.map((item) => [item.attendingCount, item.interestedCount]), [[0, null], [2, 8]]);
  assert.equal(calls.length, 2);
  for (const { url, init } of calls) {
    assert.equal(url.origin, "https://graph.facebook.com");
    assert.equal(url.pathname, `/v26.0/${pageId}/events`);
    assert.equal(url.searchParams.get("limit"), "50");
    assert.ok(url.searchParams.get("fields").split(",").includes("attending_count"));
    assert.ok(url.searchParams.get("fields").split(",").includes("interested_count"));
    assert.equal(url.searchParams.has("access_token"), false);
    assert.equal(init.method, "GET");
    assert.equal(init.headers.Authorization, `Bearer ${token}`);
    assert.equal(init.cache, "force-cache");
    assert.equal(init.next.revalidate, 900);
    assert.ok(init.signal instanceof AbortSignal);
    assert.equal(init.redirect, "error");
  }
  assert.equal(calls[1].url.searchParams.get("after"), "cursor+one&two");
  assert.equal(JSON.stringify(result).includes(token), false);
});

test("fresh attendance reads bypass the data cache without conflicting revalidation options", async () => {
  const { readFacebookEvents } = await api();
  const calls = [];
  const result = await readFacebookEvents({ token, fresh: true, fetcher: fakeFetch([
    { data: [{ ...rawEvent, interested_count: 7 }] },
  ], calls) });
  assert.equal(result.status, "connected");
  assert.equal(result.events[0].interestedCount, 7);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.cache, "no-store");
  assert.equal(calls[0].init.next, undefined);
  assert.equal(calls[0].init.headers.Authorization, `Bearer ${token}`);
  assert.equal(calls[0].url.searchParams.has("access_token"), false);
});

test("bounds reads at three pages without pretending to retrieve a full archive", async () => {
  const { readFacebookEvents } = await api();
  const calls = [];
  const pages = ["1", "2", "3"].map((id) => ({ data: [{ ...rawEvent, id }], paging: { next: "https://unused.example", cursors: { after: `cursor${id}` } } }));
  const result = await readFacebookEvents({ token, fetcher: fakeFetch(pages, calls) });
  assert.equal(result.status, "connected");
  assert.equal(result.events.length, 3);
  assert.equal(calls.length, 3);
});

test("a later page failure discards partial data instead of reporting a successful empty agenda", async () => {
  const { readFacebookEvents } = await api();
  const result = await readFacebookEvents({ token, fetcher: fakeFetch([
    { data: [rawEvent], paging: { next: "https://unused.example", cursors: { after: "next" } } },
    { status: 400, body: { error: { code: 190, message: token } } },
  ]) });
  assert.deepEqual(result, { status: "unavailable", events: [] });
});

test("rejects missing/repeated cursors rather than silently accepting truncated pagination", async () => {
  const { readFacebookEvents } = await api();
  const missing = await readFacebookEvents({ token, fetcher: fakeFetch([{ data: [rawEvent], paging: { next: "https://unused.example" } }]) });
  assert.equal(missing.status, "unavailable");
  const repeated = await readFacebookEvents({ token, fetcher: fakeFetch([
    { data: [rawEvent], paging: { next: "https://unused.example", cursors: { after: "same" } } },
    { data: [rawEvent], paging: { next: "https://unused.example", cursors: { after: "same" } } },
  ]) });
  assert.equal(repeated.status, "unavailable");
});

test("cancellation is requested and an unsupported optional field gets one scoped fallback", async () => {
  const { readFacebookEvents } = await api();
  const calls = [];
  const result = await readFacebookEvents({ token, fetcher: fakeFetch([
    { status: 400, body: { error: { code: 100, message: "Tried accessing nonexisting field (is_canceled) on node type (Event)" } } },
    { data: [rawEvent, { ...rawEvent, id: "222", is_canceled: true }] },
  ], calls) });
  assert.equal(result.status, "connected");
  assert.equal(result.events.length, 1);
  assert.match(calls[0].url.searchParams.get("fields"), /is_canceled/);
  assert.equal(calls[1].url.searchParams.get("fields").includes("is_canceled"), false);
  assert.equal(calls.length, 2);
  const denied = await readFacebookEvents({ token, fetcher: fakeFetch([{ status: 400, body: { error: { code: 100, message: "Unsupported get request" } } }]) });
  assert.equal(denied.status, "unavailable");
});

test("unsupported optional fields fall back individually and remain removed across three pages", async () => {
  const { readFacebookEvents } = await api();
  const calls = [];
  const unsupported = (field) => ({ status: 400, body: { error: { code: 100, message: `Tried accessing nonexisting field (${field}) on node type (Event)` } } });
  const noOptionalFields = { ...rawEvent, attending_count: undefined, interested_count: undefined, is_canceled: undefined };
  const result = await readFacebookEvents({ token, fetcher: fakeFetch([
    unsupported("attending_count"),
    unsupported("is_canceled"),
    unsupported("interested_count"),
    ...["1", "2", "3"].map((id) => ({ data: [{ ...noOptionalFields, id }], paging: { next: `https://ignored.example/?access_token=${token}`, cursors: { after: `cursor${id}` } } })),
  ], calls) });
  assert.equal(result.status, "connected");
  assert.equal(calls.length, 6);
  assert.deepEqual(result.events.map((item) => [item.attendingCount, item.interestedCount]), [[null, null], [null, null], [null, null]]);
  const requestedFields = calls.map(({ url }) => url.searchParams.get("fields").split(","));
  assert.ok(requestedFields[0].includes("attending_count"));
  assert.ok(requestedFields[1].includes("interested_count"));
  assert.ok(requestedFields[1].includes("is_canceled"));
  assert.ok(requestedFields[2].includes("interested_count"));
  for (const fields of requestedFields.slice(1)) assert.equal(fields.includes("attending_count"), false);
  for (const fields of requestedFields.slice(2)) assert.equal(fields.includes("is_canceled"), false);
  for (const fields of requestedFields.slice(3)) assert.equal(fields.includes("interested_count"), false);
  assert.deepEqual(calls.map(({ url }) => url.searchParams.get("after")), [null, null, null, null, "cursor1", "cursor2"]);
  assert.equal(JSON.stringify(result).includes(token), false);
});

test("a repeated unsupported field stops retrying after its single removal", async () => {
  const { readFacebookEvents } = await api();
  const calls = [];
  const failure = { status: 400, body: { error: { code: 100, message: "Unknown field: attending_count" } } };
  const result = await readFacebookEvents({ token, fetcher: fakeFetch([failure, failure], calls) });
  assert.deepEqual(result, { status: "unavailable", events: [] });
  assert.equal(calls.length, 2);
});

test("count fallback never retries unrelated fields, similarly named fields, or permission errors", async () => {
  const { readFacebookEvents } = await api();
  for (const error of [
    { code: 100, message: "Tried accessing nonexisting field (attending_count_extra) on node type (Event)" },
    { code: 100, message: "Tried accessing nonexisting field (name) on node type (Event); requested attending_count" },
    { code: 100, message: "Unsupported get request for attending_count" },
    { code: 100, message: "Permission denied for field attending_count" },
    { code: 190, message: "Tried accessing nonexisting field (attending_count) on node type (Event)" },
    { code: 200, message: "Unknown field: interested_count" },
  ]) {
    const calls = [];
    const result = await readFacebookEvents({ token, fetcher: fakeFetch([{ status: 400, body: { error } }], calls) });
    assert.deepEqual(result, { status: "unavailable", events: [] });
    assert.equal(calls.length, 1);
  }
});

test("HTTP, Graph, JSON and body timeout failures stay unavailable without throwing secrets", async () => {
  const { readFacebookEvents } = await api();
  for (const fixture of [
    { status: 500, body: { error: { message: token } } },
    { body: { error: { code: 200, message: token } } },
    { body: { unexpected: [] } },
    { jsonError: new SyntaxError(token) },
    { jsonError: new DOMException(token, "TimeoutError") },
    new Error(token),
  ]) {
    const result = await readFacebookEvents({ token, fetcher: fakeFetch([fixture]) });
    assert.deepEqual(result, { status: "unavailable", events: [] });
    assert.equal(JSON.stringify(result).includes(token), false);
  }
  assert.deepEqual(await readFacebookEvents({ token, fetcher: fakeFetch([{ data: [] }]) }), { status: "connected", events: [] });
});

test("known credentials cannot be echoed through selected public fields", async () => {
  const { readFacebookEvents } = await api();
  const result = await readFacebookEvents({ token, fetcher: fakeFetch([{ data: [{ ...rawEvent, name: `Show ${token}`, place: { name: token, location: { city: token } }, cover: { source: `https://example.com/${encodeURIComponent(token)}.jpg?access_token=${token}` } }], paging: { ignored: token } }]) });
  assert.equal(result.status, "connected");
  assert.equal(result.events.length, 1);
  assert.equal(JSON.stringify(result).includes(token), false);
});
