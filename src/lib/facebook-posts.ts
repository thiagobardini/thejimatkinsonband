export type BandPost = {
  id: string;
  message: string | null;
  publishedAt: string;
  permalink: string;
  imageUrl: string | null;
  attachmentTitle: string | null;
  attachmentDescription: string | null;
  kind: "photo" | "video" | "link" | "text";
};

export type BandPostsPage = {
  status: "connected" | "unavailable" | "unconfigured";
  posts: BandPost[];
  nextCursor: string | null;
};

type PostsReadResult = Omit<BandPostsPage, "nextCursor"> & { nextAfter: string | null };
type FacebookRequestInit = RequestInit & { next?: { revalidate: number } };
type PostsReadOptions = {
  token?: string;
  pageId?: string;
  graphVersion?: string;
  after?: string | null;
  fetcher?: (url: string, init: FacebookRequestInit) => Promise<Pick<Response, "ok" | "json">>;
};

export const DEFAULT_NEWS_PAGE_ID = "1813541058730407";
// Public profile linked by the band's Facebook posts; distinct from the Graph Page ID.
const NEWS_PUBLIC_PAGE_ID = "100063041748866";
const NEWS_PERMALINK_PAGE_ID = "1427040162740695";
const PAGE_SIZE = 6;
const POST_FIELDS = "id,message,created_time,permalink_url,full_picture,is_published,is_hidden,timeline_visibility,status_type,attachments{media_type,type,title,description,media,subattachments{media_type,type,title,description,media}}";

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function text(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, " ")
    .replace(/[^\S\n]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

function publicUrl(value: unknown, facebookOnly = false): string | null {
  if (typeof value !== "string" || value.length > 8192) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    if (facebookOnly && url.hostname !== "facebook.com" && !url.hostname.endsWith(".facebook.com")) return null;
    for (const key of [...url.searchParams.keys()]) {
      if (/^(access_token|appsecret_proof|client_secret|fb_exchange_token|token)$/i.test(key)) url.searchParams.delete(key);
    }
    return url.href;
  } catch {
    return null;
  }
}

function publishedDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-]\d{2}:?\d{2})$/);
  if (!match) return null;
  const [year, month, day, hour, minute, second] = match.slice(1).map(Number);
  const leap = year % 400 === 0 || (year % 4 === 0 && year % 100 !== 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > days[month - 1] || hour > 23 || minute > 59 || second > 59) return null;
  return Number.isFinite(Date.parse(value)) ? value : null;
}

function attachmentRows(value: unknown): Record<string, unknown>[] {
  const data = record(value)?.data;
  if (!Array.isArray(data)) return [];
  return data.slice(0, 12).flatMap((item) => {
    const row = record(item);
    if (!row) return [];
    const children = record(row.subattachments)?.data;
    return [row, ...(Array.isArray(children) ? children.slice(0, 12).map(record).filter((child) => child !== null) : [])];
  });
}

function inaccessibleAttachment(attachment: Record<string, unknown>): boolean {
  return attachment.type === "native_templates"
    && /^this content (?:isn['’]t|is not) available right now\.?$/i.test(text(attachment.title, 400) ?? "");
}

export function normalizeFacebookPost(value: unknown, publicPageId?: string): BandPost | null {
  const post = record(value);
  if (!post || typeof post.id !== "string" || !/^\d{1,32}(?:_\d{1,32})?$/.test(post.id)) return null;
  if (post.is_published === false || (post.is_published != null && typeof post.is_published !== "boolean")) return null;
  if (post.is_hidden === true || (post.is_hidden != null && typeof post.is_hidden !== "boolean")
    || post.timeline_visibility === "hidden") return null;
  // Canonical event creation belongs in Shows; written promotions and shared event stories remain news.
  if (post.status_type === "created_event") return null;
  const publishedAt = publishedDate(post.created_time);
  if (!publishedAt) return null;
  const rawAttachments = attachmentRows(post.attachments);
  const inaccessibleShare = rawAttachments.some(inaccessibleAttachment);
  const attachments = rawAttachments.filter((item) => !inaccessibleAttachment(item));
  const attachmentTitle = attachments.map((item) => text(item.title, 400)).find(Boolean) ?? null;
  const attachmentDescription = attachments.map((item) => text(item.description, 4000)).find(Boolean) ?? null;
  const imageUrl = (inaccessibleShare ? null : publicUrl(post.full_picture))
    ?? attachments.map((item) => publicUrl(record(record(item.media)?.image)?.src)).find(Boolean) ?? null;
  let message = text(post.message, 16000);
  const bareLink = message !== null && /^https?:\/\/\S+$/i.test(message);
  // Meta may replace a shared target with a privacy/deletion template. It is not news content.
  if (inaccessibleShare && bareLink && !imageUrl && !attachmentTitle && !attachmentDescription) return null;
  // Shared posts often contain only their source URL; the attachment carries the story.
  if (bareLink && (attachmentTitle || attachmentDescription)) message = null;
  if (!message && !imageUrl && !attachmentTitle && !attachmentDescription) return null;
  const [pageId, postId] = post.id.split("_");
  let permalink = publicUrl(post.permalink_url, true)
    ?? (postId ? `https://www.facebook.com/${pageId}/posts/${postId}/` : `https://www.facebook.com/${pageId}/`);
  if (publicPageId && /^\d{1,32}$/.test(publicPageId)) {
    const url = new URL(permalink);
    const pathPost = url.pathname.match(/^\/(\d{1,32})\/posts\/(\d{1,32})\/?$/);
    const queryPostId = /^\/(?:story|permalink)\.php$/.test(url.pathname)
      ? url.searchParams.get("story_fbid") : null;
    const storyId = pathPost?.[2] || (queryPostId && /^\d{1,32}$/.test(queryPostId) ? queryPostId : null);
    const ownerId = pathPost?.[1] || url.searchParams.get("id");
    const knownOwner = ownerId === pageId || ownerId === publicPageId
      || (pageId === DEFAULT_NEWS_PAGE_ID && ownerId === NEWS_PERMALINK_PAGE_ID);
    if (storyId && knownOwner) {
      // Use the public Page route for native app handoff, retaining photo substory selectors.
      url.pathname = "/permalink.php";
      url.searchParams.set("story_fbid", storyId);
      url.searchParams.set("id", publicPageId);
      permalink = url.href;
    }
  }
  const hasVideo = attachments.some((item) => /video/i.test(String(item.media_type ?? item.type ?? "")));
  const kind: BandPost["kind"] = hasVideo ? "video" : imageUrl ? "photo" : bareLink || attachments.length ? "link" : "text";
  return { id: post.id, message, publishedAt, permalink, imageUrl, attachmentTitle, attachmentDescription, kind };
}

export async function readFacebookPosts({ token: suppliedToken, pageId = DEFAULT_NEWS_PAGE_ID, graphVersion = "v26.0", after = null, fetcher = fetch }: PostsReadOptions = {}): Promise<PostsReadResult> {
  const token = suppliedToken?.trim();
  if (!token) return { status: "unconfigured", posts: [], nextAfter: null };
  const unavailable: PostsReadResult = { status: "unavailable", posts: [], nextAfter: null };
  if (!/^\d{1,32}$/.test(pageId) || !/^v\d+\.\d+$/.test(graphVersion)
    || (after !== null && (typeof after !== "string" || !after.trim() || after.length > 2048 || after.includes(token)))) return unavailable;
  try {
    const url = new URL(`https://graph.facebook.com/${graphVersion}/${pageId}/posts`);
    url.searchParams.set("fields", POST_FIELDS);
    url.searchParams.set("limit", String(PAGE_SIZE));
    if (after !== null) url.searchParams.set("after", after);
    const response = await fetcher(url.href, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      redirect: "error",
      cache: "force-cache",
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(15_000),
    });
    const body = record(await response.json());
    if (!response.ok || !body || body.error || !Array.isArray(body.data)) return unavailable;
    const posts = new Map<string, BandPost>();
    for (const raw of body.data.slice(0, PAGE_SIZE)) {
      const normalized = normalizeFacebookPost(raw, pageId === DEFAULT_NEWS_PAGE_ID ? NEWS_PUBLIC_PAGE_ID : undefined);
      if (!normalized) continue;
      const clean = Object.fromEntries(Object.entries(normalized).map(([key, value]) => [
        key,
        typeof value === "string" ? value.replaceAll(token, "[REDACTED]").replaceAll(encodeURIComponent(token), "[REDACTED]") : value,
      ])) as BandPost;
      posts.set(clean.id, clean);
    }
    let nextAfter: string | null = null;
    const paging = record(body.paging);
    if (paging?.next != null) {
      const candidate = record(paging.cursors)?.after;
      if (typeof paging.next !== "string" || !paging.next || typeof candidate !== "string" || !candidate.trim()
        || candidate.length > 2048 || candidate === after || candidate.includes(token)) return unavailable;
      nextAfter = candidate;
    }
    // paging.next can contain credentials. Only the verified opaque after value is used internally.
    return { status: "connected", posts: [...posts.values()].sort((left, right) => Date.parse(right.publishedAt) - Date.parse(left.publishedAt) || right.id.localeCompare(left.id)), nextAfter };
  } catch {
    // Graph errors and raw bodies are deliberately neither logged nor sent to the browser.
    return unavailable;
  }
}
