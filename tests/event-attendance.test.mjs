import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

const moduleUrl = new URL("../src/lib/event-attendance.ts", import.meta.url);
const privateToken = "PRIVATE_ATTENDANCE_TEST_TOKEN";

async function api() {
  assert.ok(existsSync(moduleUrl), "The fresh attendance reader is not implemented yet");
  return import(moduleUrl.href);
}

function show(overrides = {}) {
  return {
    id: "952642270764299", title: "SSB Clinton", startsAt: "2026-11-21T18:00:00-0500",
    endsAt: "2026-11-21T21:00:00-0500", venue: "Sterling Street Brewery",
    location: "Clinton, Massachusetts", coverUrl: "https://example.com/poster.jpg",
    eventUrl: "https://www.facebook.com/events/952642270764299/",
    attendingCount: 2, interestedCount: 8, ...overrides,
  };
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

test("attendance publishes only IDs and normalized counts, preserving zero and unknown", async () => {
  const { createAttendanceReader } = await api();
  const read = createAttendanceReader(async () => ({
    status: "connected",
    events: [show({ title: privateToken, attendingCount: 0, interestedCount: null, access_token: privateToken })],
    access_token: privateToken,
  }));
  const result = await read();
  assert.deepEqual(result, {
    status: "connected",
    events: [{ id: "952642270764299", attendingCount: 0, interestedCount: null }],
  });
  assert.equal(JSON.stringify(result).includes(privateToken), false);
});

test("successful attendance expires after a minute and count decreases replace old values", async () => {
  const { createAttendanceReader } = await api();
  let now = 0;
  let calls = 0;
  const read = createAttendanceReader(async () => {
    calls += 1;
    return { status: "connected", events: [show({ interestedCount: calls === 1 ? 8 : 7 })] };
  }, { now: () => now });
  assert.equal((await read()).events[0].interestedCount, 8);
  now = 59_999;
  assert.equal((await read()).events[0].interestedCount, 8);
  assert.equal(calls, 1);
  now = 60_000;
  assert.equal((await read()).events[0].interestedCount, 7);
  assert.equal(calls, 2);
});

test("concurrent expired requests wait for one fresh result instead of stale attendance", async () => {
  const { createAttendanceReader } = await api();
  let now = 0;
  let calls = 0;
  const fresh = deferred();
  const read = createAttendanceReader(async () => {
    calls += 1;
    return calls === 1 ? { status: "connected", events: [show()] } : fresh.promise;
  }, { now: () => now });
  await read();
  now = 60_000;
  let finished = false;
  const first = read().then((value) => { finished = true; return value; });
  const second = read();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(finished, false);
  assert.equal(calls, 2);
  fresh.resolve({ status: "connected", events: [show({ interestedCount: 7 })] });
  assert.deepEqual(await first, await second);
  assert.equal((await second).events[0].interestedCount, 7);
  assert.equal(calls, 2);
});

test("failed and unconfigured reads are not cached and cannot expose raw failures", async () => {
  const { createAttendanceReader } = await api();
  let calls = 0;
  const read = createAttendanceReader(() => {
    calls += 1;
    if (calls === 1) throw new Error(privateToken);
    if (calls === 2) return Promise.resolve({ status: "unavailable", events: [show({ title: privateToken })], error: privateToken });
    if (calls === 3) return Promise.resolve({ status: "unconfigured", events: [] });
    return Promise.resolve({ status: "connected", events: [show({ interestedCount: 7 })] });
  });
  assert.deepEqual(await read(), { status: "unavailable", events: [] });
  assert.deepEqual(await read(), { status: "unavailable", events: [] });
  assert.deepEqual(await read(), { status: "unconfigured", events: [] });
  assert.equal((await read()).events[0].interestedCount, 7);
  assert.equal(calls, 4);
});

test("an expired success is not served after failure and the next request can recover", async () => {
  const { createAttendanceReader } = await api();
  let now = 0;
  let calls = 0;
  const read = createAttendanceReader(async () => {
    calls += 1;
    if (calls === 2) return { status: "unavailable", events: [] };
    return { status: "connected", events: [show({ interestedCount: calls === 1 ? 8 : 7 })] };
  }, { now: () => now });
  await read();
  now = 60_000;
  assert.deepEqual(await read(), { status: "unavailable", events: [] });
  assert.equal((await read()).events[0].interestedCount, 7);
  assert.equal(calls, 3);
});
