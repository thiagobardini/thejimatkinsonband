import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

const moduleUrl = new URL("../src/lib/news-pagination.ts", import.meta.url);
const post = (id, message = `News ${id}`) => ({
  id, message, publishedAt: "2026-11-04T16:00:00+0000",
  permalink: `https://www.facebook.com/thejimatkinsonband/posts/${id}`,
  imageUrl: null, attachmentTitle: null, attachmentDescription: null, kind: "text",
});
const page = (posts, nextCursor = null, status = "connected") => ({ status, posts, nextCursor });
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

async function setup(initial, fetchPage) {
  assert.ok(existsSync(moduleUrl), "News pagination is not implemented yet");
  const { createNewsPager } = await import(moduleUrl.href);
  const snapshots = [];
  const pager = createNewsPager({ initial, fetchPage, onChange: (state) => snapshots.push(state) });
  return { ...pager, snapshots, get last() { return snapshots.at(-1); } };
}

test("appends posts in Facebook order without replacing initial posts or adding duplicate IDs", async () => {
  const initial = page([post("1"), post("2")], "older-A");
  const original = structuredClone(initial);
  const env = await setup(initial, async (cursor, signal) => {
    assert.equal(cursor, "older-A");
    assert.ok(signal instanceof AbortSignal);
    return page([post("2", "Changed upstream"), post("3"), post("3"), post("4")], "older-B");
  });
  await env.loadMore();
  assert.deepEqual(env.last.posts.map(({ id }) => id), ["1", "2", "3", "4"]);
  assert.equal(env.last.posts[1].message, "News 2");
  assert.equal(env.last.nextCursor, "older-B");
  assert.equal(env.last.loading, false);
  assert.equal(env.last.error, false);
  assert.deepEqual(initial, original);
  assert.notEqual(env.last.posts, initial.posts);
});

test("coalesces concurrent requests and publishes loading before the page arrives", async () => {
  const pending = deferred();
  let requests = 0;
  const env = await setup(page([post("1")], "older-A"), async () => {
    requests++;
    return pending.promise;
  });
  const first = env.loadMore();
  const second = env.loadMore();
  assert.equal(first, second);
  assert.deepEqual(env.last, {
    posts: [post("1")], nextCursor: "older-A", loading: true, error: false,
  });
  await Promise.resolve();
  assert.equal(requests, 1);
  pending.resolve(page([post("2")]));
  await first;
  assert.deepEqual(env.last.posts.map(({ id }) => id), ["1", "2"]);
  assert.equal(env.last.loading, false);
  assert.equal(env.last.nextCursor, null);
  await env.loadMore();
  assert.equal(requests, 1, "An exhausted feed must not issue another request");
});

test("continues after an empty page when Facebook supplies a different next cursor", async () => {
  const cursors = [];
  const env = await setup(page([post("1")], "older-A"), async (cursor) => {
    cursors.push(cursor);
    return cursor === "older-A" ? page([], "older-B") : page([post("2")]);
  });
  await env.loadMore();
  assert.equal(env.last.nextCursor, "older-B");
  assert.deepEqual(env.last.posts.map(({ id }) => id), ["1"]);
  await env.loadMore();
  assert.deepEqual(cursors, ["older-A", "older-B"]);
  assert.deepEqual(env.last.posts.map(({ id }) => id), ["1", "2"]);
});

test("stops a repeated cursor immediately and stops cycles back to an already consumed page", async () => {
  for (const cycle of [false, true]) {
    const cursors = [];
    const env = await setup(page([post("1")], "older-A"), async (cursor) => {
      cursors.push(cursor);
      if (!cycle) return page([post("2")], "older-A");
      return cursor === "older-A" ? page([post("2")], "older-B") : page([post("3")], "older-A");
    });
    await env.loadMore();
    if (cycle) await env.loadMore();
    assert.equal(env.last.nextCursor, null);
    assert.equal(env.last.error, false);
    const count = cursors.length;
    await env.loadMore();
    assert.equal(cursors.length, count);
    assert.deepEqual(cursors, cycle ? ["older-A", "older-B"] : ["older-A"]);
  }
});

test("retains posts and cursor after failure so an explicit retry can recover", async () => {
  const initial = page([post("1")], "older-A");
  let attempts = 0;
  const cursors = [];
  const env = await setup(initial, async (cursor) => {
    cursors.push(cursor);
    attempts++;
    if (attempts === 1) throw new Error("Offline");
    if (attempts === 2) return page([], null, "unavailable");
    if (attempts === 3) return page([], null, "unconfigured");
    return page([post("2")]);
  });
  for (let attempt = 0; attempt < 3; attempt++) {
    await env.loadMore();
    assert.deepEqual(env.last, { posts: [post("1")], nextCursor: "older-A", loading: false, error: true });
  }
  const retry = env.loadMore();
  assert.equal(env.last.error, false);
  assert.equal(env.last.loading, true);
  await retry;
  assert.deepEqual(env.last.posts.map(({ id }) => id), ["1", "2"]);
  assert.equal(env.last.error, false);
  assert.deepEqual(cursors, ["older-A", "older-A", "older-A", "older-A"]);
});

test("cancel aborts the pending request and ignores a response that completes afterward", async () => {
  const pending = deferred();
  let requestSignal, requests = 0;
  const env = await setup(page([post("1")], "older-A"), async (_cursor, signal) => {
    requests++;
    requestSignal = signal;
    return pending.promise;
  });
  const loading = env.loadMore();
  await Promise.resolve();
  const snapshotCount = env.snapshots.length;
  env.cancel();
  assert.equal(requestSignal.aborted, true);
  pending.resolve(page([post("2")], "older-B"));
  await loading;
  assert.equal(env.snapshots.length, snapshotCount);
  await env.loadMore();
  assert.equal(requests, 1);
});

test("does not fetch or emit state after cancellation before the first load", async () => {
  const env = await setup(page([post("1")], "older-A"), async () => {
    assert.fail("A cancelled pager must not fetch");
  });
  env.cancel();
  await env.loadMore();
  assert.equal(env.snapshots.length, 0);
});
