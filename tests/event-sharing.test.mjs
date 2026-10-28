import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

const sharingModule = new URL("../src/lib/event-sharing.ts", import.meta.url);
const posterModule = new URL("../src/lib/event-poster.ts", import.meta.url);
const show = {
  id: "952642270764299", title: "Blues & Roots #1?",
  startsAt: "2026-11-21T18:00:00-0500", endsAt: "2026-11-21T21:00:00-0500",
  venue: "SSB Clinton", location: "Clinton, MA", coverUrl: null,
  eventUrl: "https://www.facebook.com/events/952642270764299/",
};

async function sharing() {
  assert.ok(existsSync(sharingModule), "Event sharing is not implemented yet");
  return import(sharingModule.href);
}
async function posters() {
  assert.ok(existsSync(posterModule), "Event poster loading is not implemented yet");
  return import(posterModule.href);
}

test("shared links and metadata identify the individual show on the band's website", async () => {
  const { getEventShare, getEventMetadata } = await sharing();
  const share = getEventShare(show, "https://thejimatkinsonband.com");
  assert.equal(share.url, "https://thejimatkinsonband.com/shows/952642270764299");
  assert.equal(share.title, "Blues & Roots #1?");
  assert.match(share.text, /Nov 21, 2026/);
  assert.match(share.text, /6–9 PM ET/);
  assert.match(share.text, /SSB Clinton/);
  const metadata = getEventMetadata(show, "https://thejimatkinsonband.com");
  assert.equal(metadata.alternates.canonical, share.url);
  assert.equal(metadata.openGraph.url, share.url);
  assert.equal(metadata.openGraph.title, show.title);
  assert.equal(metadata.openGraph.images[0].url, "https://thejimatkinsonband.com/shows/952642270764299/opengraph-image");
  assert.equal(metadata.twitter.images[0], "https://thejimatkinsonband.com/shows/952642270764299/twitter-image");
});

test("share dates stay in Eastern time across midnight and omit missing places", async () => {
  const { getEventShare } = await sharing();
  const share = getEventShare({ ...show, startsAt: "2026-11-22T01:00:00Z", endsAt: null, venue: null, location: null }, "https://thejimatkinsonband.com");
  assert.match(share.text, /Sat, Nov 21, 2026/);
  assert.match(share.text, /8 PM ET/);
  assert.doesNotMatch(share.text, /null|undefined/);
});

test("WhatsApp and SMS preserve titles, punctuation and the event URL without double encoding", async () => {
  const { getEventShare, getShareLinks } = await sharing();
  const share = getEventShare(show, "https://thejimatkinsonband.com");
  const links = getShareLinks(share);
  const whatsapp = new URL(links.whatsapp);
  assert.equal(whatsapp.origin, "https://wa.me");
  assert.equal(whatsapp.searchParams.get("text"), `${show.title}\n${share.text}\n${share.url}`);
  assert.equal(new URL(links.sms).searchParams.get("body"), whatsapp.searchParams.get("text"));
  assert.ok(getShareLinks(share, true).sms.startsWith("sms:&body="));
});

test("event links reject paths and identifiers that are not Facebook event IDs", async () => {
  const { eventPath } = await sharing();
  for (const id of ["../admin", "123?url=x", "", "123abc", "1".repeat(33)]) assert.throws(() => eventPath(id));
});

test("poster loading accepts Facebook CDN images and rejects redirects, invalid types and excessive bodies", async () => {
  const { readEventPoster } = await posters();
  const calls = [];
  const good = await readEventPoster("https://scontent.xx.fbcdn.net/event.jpg?size=large", async (url, init) => {
    calls.push({ url, init });
    return new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "image/jpeg" } });
  });
  assert.deepEqual([...new Uint8Array(good.bytes)], [1, 2, 3]);
  assert.equal(good.type, "image/jpeg");
  assert.equal(calls[0].init.redirect, "error");
  assert.equal(calls[0].init.headers, undefined);
  for (const response of [
    new Response("<html>not a poster</html>", { headers: { "content-type": "text/html" } }),
    new Response("x", { headers: { "content-type": "image/png", "content-length": "9000000" } }),
    new Response("missing", { status: 404 }),
    new Response(new Uint8Array(4 * 1024 * 1024 + 1), { headers: { "content-type": "image/png" } }),
  ]) assert.equal(await readEventPoster("https://scontent.xx.fbcdn.net/event.jpg", async () => response), null);
  assert.equal(await readEventPoster("https://scontent.xx.fbcdn.net/event.jpg", async () => { throw new Error("unavailable"); }), null);
});

test("poster loading never requests arbitrary origins, private addresses, credentials or deceptive hosts", async () => {
  const { readEventPoster } = await posters();
  let calls = 0;
  const fetcher = async () => { calls++; throw new Error("must not fetch"); };
  for (const url of [null, "http://scontent.xx.fbcdn.net/a.jpg", "https://fbcdn.net.attacker.com/a.jpg", "https://127.0.0.1/a", "https://user:pass@scontent.xx.fbcdn.net/a", "https://scontent.xx.fbcdn.net:8080/a", "https://example.com/a"]) {
    assert.equal(await readEventPoster(url, fetcher), null);
  }
  assert.equal(calls, 0);
});
