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
};

async function api() {
  assert.ok(existsSync(moduleUrl), "Facebook events data module is not implemented yet");
  return import(moduleUrl.href);
}

function event(id, startsAt, endsAt = null) {
  return { id, title: `Show ${id}`, startsAt, endsAt, venue: null, location: null, coverUrl: null, eventUrl: `https://www.facebook.com/events/${id}/` };
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
  assert.equal(normalizeFacebookEvent({ ...minimal, cover: { source: "javascript:alert(1)" } }).coverUrl, null);
  assert.equal(normalizeFacebookEvent({ ...minimal, cover: { source: "https://name:password@example.com/image.jpg" } }).coverUrl, null);
  assert.equal(normalizeFacebookEvent({ ...minimal, cover: { source: `https://example.com/image.jpg?access_token=${token}&size=small` } }).coverUrl, "https://example.com/image.jpg?size=small");
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
    { data: [{ ...rawEvent, id: "123", name: "Earlier", start_time: "2026-10-24T15:00:00-0400", end_time: "2026-10-24T18:00:00-0400" }, rawEvent] },
  ], calls) });
  assert.equal(result.status, "connected");
  assert.deepEqual(result.events.map((item) => item.id), ["123", "952642270764299"]);
  assert.equal(calls.length, 2);
  for (const { url, init } of calls) {
    assert.equal(url.origin, "https://graph.facebook.com");
    assert.equal(url.pathname, `/v26.0/${pageId}/events`);
    assert.equal(url.searchParams.get("limit"), "50");
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
