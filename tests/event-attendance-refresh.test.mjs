import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

const moduleUrl = new URL("../src/lib/event-attendance-refresh.ts", import.meta.url);
const id = "952642270764299";
const attendance = (interestedCount = 7, attendingCount = 2) => ({
  events: [{ id, attendingCount, interestedCount }],
});
const settle = () => new Promise((resolve) => setImmediate(resolve));

async function setup(fixtures, visible = true) {
  assert.ok(existsSync(moduleUrl), "Attendance refresh is not implemented yet");
  const { watchEventAttendance } = await import(moduleUrl.href);
  const page = new EventTarget();
  page.visibilityState = visible ? "visible" : "hidden";
  const view = new EventTarget();
  const calls = [], updates = [];
  let interval = null, now = 0;
  const stop = watchEventAttendance((value) => updates.push(value), {
    page, view, now: () => now,
    schedule(callback, delay) {
      assert.equal(delay, 60_000);
      assert.equal(interval, null, "Only one polling interval should run");
      interval = callback;
      return () => { interval = null; };
    },
    async fetcher(url, options) {
      calls.push({ url, options });
      const fixture = fixtures.shift();
      assert.notEqual(fixture, undefined, "Unexpected attendance request");
      if (fixture instanceof Error) throw fixture;
      if (typeof fixture === "function") return fixture();
      return new Response(JSON.stringify(fixture.body ?? fixture), { status: fixture.status ?? 200 });
    },
  });
  return {
    page, view, calls, updates, stop,
    get polling() { return interval !== null; },
    tick() { now += 60_000; interval?.(); },
    advance() { now += 5_000; },
    visibility(state) { page.visibilityState = state; page.dispatchEvent(new Event("visibilitychange")); },
  };
}

test("refreshes on mount and replaces counts when interest decreases, including zero", async () => {
  const env = await setup([attendance(8), attendance(7), attendance(0, 0)]);
  await settle();
  assert.deepEqual(env.updates[0][id], { attendingCount: 2, interestedCount: 8 });
  env.tick(); await settle();
  assert.equal(env.updates[1][id].interestedCount, 7);
  env.tick(); await settle();
  assert.deepEqual(env.updates[2][id], { attendingCount: 0, interestedCount: 0 });
  assert.equal(env.calls[0].url, "/api/events/attendance");
  assert.equal(env.calls[0].options.cache, "no-store");
  assert.ok(env.calls[0].options.signal instanceof AbortSignal);
  env.stop();
});

test("stops polling in hidden tabs and refreshes on return, focus and Safari pageshow", async () => {
  const env = await setup([attendance(7), attendance(6), attendance(5)], false);
  await settle();
  assert.equal(env.calls.length, 0);
  assert.equal(env.polling, false);
  env.visibility("visible"); await settle();
  assert.equal(env.polling, true);
  assert.equal(env.calls.length, 1);
  env.view.dispatchEvent(new Event("focus")); await settle();
  assert.equal(env.calls.length, 1, "Coalesce simultaneous return events");
  env.advance(); env.view.dispatchEvent(new Event("focus")); await settle();
  assert.equal(env.calls.length, 2);
  env.advance(); env.view.dispatchEvent(new Event("pageshow")); await settle();
  assert.equal(env.calls.length, 3);
  env.visibility("hidden");
  assert.equal(env.polling, false);
  env.advance(); env.view.dispatchEvent(new Event("focus")); await settle();
  assert.equal(env.calls.length, 3);
  env.stop();
});

test("keeps last-known counts during errors and malformed payloads, accepts explicit unknown", async () => {
  const env = await setup([
    attendance(7), { status: 503, body: { error: "unavailable" } }, new Error("offline"),
    attendance(-1), { events: [{ id: "invalid", interestedCount: 42, attendingCount: 1 }] },
    attendance(null, null),
  ]);
  await settle();
  for (let index = 0; index < 4; index++) { env.tick(); await settle(); }
  assert.equal(env.updates.length, 1);
  assert.equal(env.updates[0][id].interestedCount, 7);
  env.tick(); await settle();
  assert.deepEqual(env.updates[1][id], { attendingCount: null, interestedCount: null });
  env.stop();
});

test("deduplicates in-flight refreshes and ignores late responses after cleanup", async () => {
  let complete;
  const env = await setup([() => new Promise((resolve) => { complete = resolve; })]);
  await settle();
  env.tick(); env.view.dispatchEvent(new Event("focus"));
  assert.equal(env.calls.length, 1);
  env.stop();
  assert.equal(env.polling, false);
  assert.equal(env.calls[0].options.signal.aborted, true);
  complete(new Response(JSON.stringify(attendance(6))));
  await settle();
  assert.equal(env.updates.length, 0);
  env.advance(); env.view.dispatchEvent(new Event("focus"));
  env.visibility("visible"); env.view.dispatchEvent(new Event("pageshow"));
  await settle();
  assert.equal(env.calls.length, 1);
});
