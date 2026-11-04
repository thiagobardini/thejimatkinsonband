import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

const moduleUrl = new URL("../src/lib/facebook-posts.ts", import.meta.url);
const cursorUrl = new URL("../src/lib/facebook-posts-cursor.ts", import.meta.url);
const token = "PRIVATE_NEWS_TEST_TOKEN";
const pageId = "1813541058730407";
const post = {
  id: `${pageId}_123`,
  created_time: "2026-10-17T15:30:00+0000",
  permalink_url: "https://www.facebook.com/story.php?story_fbid=123&id=1813541058730407",
  message: " Hello friends!\n\nA little news from the band. ",
  is_published: true,
};

async function api() {
  assert.ok(existsSync(moduleUrl), "Facebook posts data module is not implemented yet");
  return import(moduleUrl.href);
}

function fakeFetch(fixtures, calls = []) {
  return async (url, init) => {
    calls.push({ url: new URL(url), init });
    assert.ok(fixtures.length, "Unexpected Graph request");
    const fixture = fixtures.shift();
    if (fixture instanceof Error) throw fixture;
    if (fixture.jsonError) return { ok: true, json: async () => { throw fixture.jsonError; } };
    return new Response(JSON.stringify(fixture.body ?? fixture), { status: fixture.status ?? 200 });
  };
}

test("news preserves text-only announcements and paragraph spacing without inventing a title", async () => {
  const { normalizeFacebookPost } = await api();
  assert.deepEqual(normalizeFacebookPost(post), {
    id: `${pageId}_123`, message: "Hello friends!\n\nA little news from the band.",
    publishedAt: "2026-10-17T15:30:00+0000", permalink: post.permalink_url,
    imageUrl: null, attachmentTitle: null, attachmentDescription: null, kind: "text",
  });
});

test("band news uses the public Page permalink for numeric Graph post links", async () => {
  const { readFacebookPosts } = await api();
  const result = await readFacebookPosts({ token, fetcher: fakeFetch([{ data: [{
    ...post,
    id: `${pageId}_1417199643724747`,
    permalink_url: "https://www.facebook.com/1427040162740695/posts/1417199643724747",
  }, {
    ...post,
    id: `${pageId}_1427454729365905`,
    permalink_url: "https://www.facebook.com/1427040162740695/posts/1427454729365905?substory_index=1824528878749238",
    full_picture: "https://scontent.example.com/photo.jpg",
  }] }]) });
  assert.equal(result.status, "connected");
  assert.equal(result.posts.find(item => item.id.endsWith("_1417199643724747")).permalink, "https://www.facebook.com/permalink.php?story_fbid=1417199643724747&id=100063041748866");
  const photoLink = new URL(result.posts.find(item => item.id.endsWith("_1427454729365905")).permalink);
  assert.equal(photoLink.pathname, "/permalink.php");
  assert.equal(photoLink.searchParams.get("story_fbid"), "1427454729365905");
  assert.equal(photoLink.searchParams.get("id"), "100063041748866");
  assert.equal(photoLink.searchParams.get("substory_index"), "1824528878749238");
});

test("public Page normalization preserves native photo, video and opaque story destinations", async () => {
  const { readFacebookPosts } = await api();
  for (const permalink_url of [
    "https://www.facebook.com/photo/?fbid=1427454729365905&set=a.393683739409681",
    "https://www.facebook.com/watch/?v=123",
    "https://www.facebook.com/reel/123/",
    "https://www.facebook.com/permalink.php?story_fbid=pfbidPublicStory&id=100063041748866",
    "https://www.facebook.com/theband/posts/pfbidPublicStory/",
    "https://www.facebook.com/999/posts/123/",
    "https://www.facebook.com/permalink.php?story_fbid=123&id=999",
  ]) {
    const result = await readFacebookPosts({ token, fetcher: fakeFetch([{ data: [{ ...post, permalink_url }] }]) });
    assert.equal(result.posts[0].permalink, permalink_url);
  }
  const otherPage = await readFacebookPosts({ token, pageId: "999", fetcher: fakeFetch([{ data: [{ ...post, id: "999_123", permalink_url: "https://www.facebook.com/999/posts/123/" }] }]) });
  assert.equal(otherPage.posts[0].permalink, "https://www.facebook.com/999/posts/123/");
});

test("numeric story links and missing permalinks use the same public band identity", async () => {
  const { readFacebookPosts } = await api();
  for (const permalink_url of [post.permalink_url, undefined, "javascript:alert(1)"]) {
    const result = await readFacebookPosts({ token, fetcher: fakeFetch([{ data: [{ ...post, permalink_url }] }]) });
    const link = new URL(result.posts[0].permalink);
    assert.equal(link.pathname, "/permalink.php");
    assert.equal(link.searchParams.get("story_fbid"), "123");
    assert.equal(link.searchParams.get("id"), "100063041748866");
  }
});

test("shared posts retain their attachment story and album image without fetching target URLs", async () => {
  const { normalizeFacebookPost } = await api();
  const result = normalizeFacebookPost({
    ...post, message: "https://www.facebook.com/share/example/",
    attachments: { data: [{ media_type: "album", title: "An afternoon on the air", description: "Live from Lowell.", subattachments: { data: [{ media_type: "photo", media: { image: { src: "https://scontent.example.com/show.jpg" } } }] } }] },
  });
  assert.equal(result.message, null);
  assert.equal(result.attachmentTitle, "An afternoon on the air");
  assert.equal(result.attachmentDescription, "Live from Lowell.");
  assert.equal(result.imageUrl, "https://scontent.example.com/show.jpg");
  assert.equal(result.kind, "photo");
  assert.equal(normalizeFacebookPost({ ...post, attachments: { data: [{ media_type: "video", media: { image: { src: "https://scontent.example.com/video.jpg" } } }] } }).kind, "video");
});

test("bare links stay readable without metadata; event promotion posts are retained", async () => {
  const { normalizeFacebookPost } = await api();
  const bare = normalizeFacebookPost({ ...post, message: "https://example.com/news" });
  assert.equal(bare.message, "https://example.com/news");
  assert.equal(bare.kind, "link");
  const eventPost = normalizeFacebookPost({ ...post, message: "Join us Saturday!", attachments: { data: [{ type: "event", media_type: "link", title: "Our next show", media: { image: { src: "https://scontent.example.com/poster.jpg" } } }] } });
  assert.equal(eventPost.message, "Join us Saturday!");
  assert.equal(eventPost.attachmentTitle, "Our next show");
});

test("automatic event creation posts stay in Shows rather than being duplicated as news", async () => {
  const { normalizeFacebookPost } = await api();
  assert.equal(normalizeFacebookPost({
    ...post,
    status_type: "created_event",
    message: "Jim Atkinson Band Live at SSB Clinton",
    full_picture: "https://scontent.example.com/poster.jpg",
    attachments: { data: [{ type: "event", media_type: "link", title: "Jim Atkinson Band Live at SSB Clinton" }] },
  }), null);
});

test("shared event stories and written promotions survive even with identical event titles and posters", async () => {
  const { normalizeFacebookPost } = await api();
  const promotion = {
    ...post,
    message: "Jim Atkinson Band Live at SSB Clinton",
    full_picture: "https://scontent.example.com/poster.jpg",
    attachments: { data: [{ type: "event", media_type: "link", title: "Jim Atkinson Band Live at SSB Clinton" }] },
  };
  for (const status_type of ["shared_story", "added_photos", "mobile_status_update", undefined]) {
    const result = normalizeFacebookPost({ ...promotion, status_type });
    assert.equal(result?.message, "Jim Atkinson Band Live at SSB Clinton");
    assert.equal(result?.attachmentTitle, "Jim Atkinson Band Live at SSB Clinton");
    assert.equal(result?.imageUrl, "https://scontent.example.com/poster.jpg");
  }
});

test("a batch containing only automatic events still exposes the cursor for older news", async () => {
  const { readFacebookPosts } = await api();
  const result = await readFacebookPosts({ token, fetcher: fakeFetch([{
    data: [{ ...post, status_type: "created_event" }],
    paging: { next: "https://ignored.example", cursors: { after: "older-news" } },
  }]) });
  assert.equal(result.status, "connected");
  assert.deepEqual(result.posts, []);
  assert.equal(result.nextAfter, "older-news");
});

test("inaccessible Facebook shares omit placeholder errors while meaningful Page notes survive", async () => {
  const { normalizeFacebookPost, readFacebookPosts } = await api();
  const unavailable = { media_type: "link", type: "native_templates", title: "This content isn't available right now", description: "When this happens, it's usually because the owner only shared it with a small group of people.", media: { image: { src: "https://scontent.example.com/unavailable-placeholder.jpg" } } };
  const shared = { ...post, message: "https://www.facebook.com/share/not-public/", full_picture: "https://scontent.example.com/unavailable-placeholder.jpg", attachments: { data: [unavailable] } };
  assert.equal(normalizeFacebookPost(shared), null);
  const note = normalizeFacebookPost({ ...shared, message: "We are still playing tonight!" });
  assert.equal(note.message, "We are still playing tonight!");
  assert.equal(note.attachmentTitle, null);
  assert.equal(note.attachmentDescription, null);
  assert.equal(note.imageUrl, null);
  assert.equal(note.kind, "text");
  const filteredPage = await readFacebookPosts({ token, fetcher: fakeFetch([{ data: [shared], paging: { next: "https://ignored.example", cursors: { after: "older-public-posts" } } }]) });
  assert.equal(filteredPage.status, "connected");
  assert.deepEqual(filteredPage.posts, []);
  assert.equal(filteredPage.nextAfter, "older-public-posts");
});

test("unpublished, empty and malformed posts never enter the public news feed", async () => {
  const { normalizeFacebookPost } = await api();
  for (const invalid of [null, { ...post, id: "../me" }, { ...post, created_time: "tomorrow" }, { ...post, created_time: "2026-02-30T00:00:00Z" }, { ...post, is_published: false }, { ...post, message: " " }]) {
    assert.equal(normalizeFacebookPost(invalid), null);
  }
  const sanitized = normalizeFacebookPost({ ...post, permalink_url: "javascript:alert(1)", full_picture: "https://user:password@example.com/image.jpg" });
  assert.equal(sanitized.permalink, "https://www.facebook.com/1813541058730407/posts/123/");
  assert.equal(sanitized.imageUrl, null);
  assert.equal(normalizeFacebookPost({ ...post, full_picture: `https://scontent.example.com/image.jpg?access_token=${token}&size=large` }).imageUrl, "https://scontent.example.com/image.jpg?size=large");
});

test("news reads one small configured Page /posts page with header auth and five-minute revalidation", async () => {
  const { readFacebookPosts } = await api();
  const calls = [];
  const result = await readFacebookPosts({ token, after: "cursor+one&two", fetcher: fakeFetch([{ data: [post], paging: { next: `https://evil.example/?access_token=${token}`, cursors: { after: "next-two" } } }], calls) });
  assert.equal(result.status, "connected");
  assert.equal(result.posts.length, 1);
  assert.equal(result.nextAfter, "next-two");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url.origin, "https://graph.facebook.com");
  assert.equal(calls[0].url.pathname, `/v26.0/${pageId}/posts`);
  assert.equal(calls[0].url.searchParams.get("limit"), "6");
  assert.ok(calls[0].url.searchParams.get("fields").split(",").includes("status_type"), "Graph must supply the native event classification");
  assert.equal(calls[0].url.searchParams.get("after"), "cursor+one&two");
  assert.equal(calls[0].url.searchParams.has("access_token"), false);
  assert.equal(calls[0].init.headers.Authorization, `Bearer ${token}`);
  assert.equal(calls[0].init.cache, "force-cache");
  assert.equal(calls[0].init.next.revalidate, 300);
  assert.equal(calls[0].init.redirect, "error");
  assert.equal(JSON.stringify(result).includes(token), false);
});

test("news sorts newest first, deduplicates and never guesses another page from page size", async () => {
  const { readFacebookPosts } = await api();
  const result = await readFacebookPosts({ token, fetcher: fakeFetch([{ data: [post, { ...post, id: `${pageId}_456`, created_time: "2026-10-21T15:00:00Z" }, post] }]) });
  assert.deepEqual(result.posts.map(p => p.id), [`${pageId}_456`, `${pageId}_123`]);
  assert.equal(result.nextAfter, null);
});

test("invalid configuration and Graph/JSON/network errors stay safe without partial bodies", async () => {
  const { readFacebookPosts } = await api();
  const calls = [];
  assert.deepEqual(await readFacebookPosts({ fetcher: fakeFetch([], calls) }), { status: "unconfigured", posts: [], nextAfter: null });
  for (const options of [{ pageId: "../me" }, { graphVersion: "../../me" }, { after: " " }, { after: "x".repeat(2049) }]) {
    assert.deepEqual(await readFacebookPosts({ token, ...options, fetcher: fakeFetch([], calls) }), { status: "unavailable", posts: [], nextAfter: null });
  }
  assert.equal(calls.length, 0);
  for (const fixture of [{ status: 400, body: { error: { code: 190, message: token } } }, { error: { message: token } }, { other: [] }, { jsonError: new Error(token) }, new Error(token)]) {
    assert.deepEqual(await readFacebookPosts({ token, fetcher: fakeFetch([fixture]) }), { status: "unavailable", posts: [], nextAfter: null });
  }
});

test("pagination does not loop or expose a credential-bearing cursor", async () => {
  const { readFacebookPosts } = await api();
  for (const after of [undefined, "", "again", token, "x".repeat(2049)]) {
    const result = await readFacebookPosts({ token, after: "again", fetcher: fakeFetch([{ data: [post], paging: { next: "https://unused.example", cursors: { after } } }]) });
    assert.deepEqual(result, { status: "unavailable", posts: [], nextAfter: null });
  }
});

test("public news DTO strips known credentials even when the upstream echoes them", async () => {
  const { readFacebookPosts } = await api();
  const result = await readFacebookPosts({ token, fetcher: fakeFetch([{ data: [{ ...post, message: `News ${token}`, full_picture: `https://scontent.example.com/${token}.jpg?access_token=${token}` }] }]) });
  assert.equal(result.status, "connected");
  assert.equal(JSON.stringify(result).includes(token), false);
});

test("opaque news cursors are authenticated, Page-scoped, durable and reject pagination cycles", async () => {
  assert.ok(existsSync(cursorUrl), "Opaque news pagination is not implemented yet");
  const { createPostsCursorCodec, InvalidNewsCursorError } = await import(cursorUrl.href);
  const codec = createPostsCursorCodec({ token, pageId, graphVersion: "v26.0" });
  const cursor = codec.encode("graph-private-after");
  assert.equal(cursor.includes("graph-private-after"), false);
  assert.equal(cursor.includes(token), false);
  assert.equal(codec.decode(cursor).after, "graph-private-after");
  assert.equal(codec.decode(cursor).seen.length, 1);
  assert.throws(() => codec.decode(`${cursor.slice(0, -1)}${cursor.endsWith("a") ? "b" : "a"}`), InvalidNewsCursorError);
  assert.throws(() => createPostsCursorCodec({ token, pageId: "999", graphVersion: "v26.0" }).decode(cursor), InvalidNewsCursorError);
  assert.throws(() => createPostsCursorCodec({ token: "rotated-token", pageId, graphVersion: "v26.0" }).decode(cursor), InvalidNewsCursorError);
  assert.throws(() => codec.decode("https://graph.facebook.com/anything"), InvalidNewsCursorError);
  assert.throws(() => codec.encode("graph-private-after", codec.decode(cursor).seen), InvalidNewsCursorError);
  const next = codec.encode("older-page", codec.decode(cursor).seen);
  assert.equal(codec.decode(next).after, "older-page");
});
