import "server-only";
import { DEFAULT_NEWS_PAGE_ID, readFacebookPosts, type BandPostsPage } from "./facebook-posts";
import { createPostsCursorCodec, InvalidNewsCursorError } from "./facebook-posts-cursor";

export { InvalidNewsCursorError } from "./facebook-posts-cursor";

export async function getBandPosts(cursor: string | null = null): Promise<BandPostsPage> {
  const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim();
  if (!token) return { status: "unconfigured", posts: [], nextCursor: null };
  const pageId = process.env.FACEBOOK_PAGE_ID?.trim() || DEFAULT_NEWS_PAGE_ID;
  const graphVersion = process.env.FACEBOOK_GRAPH_VERSION?.trim() || "v26.0";
  const codec = createPostsCursorCodec({ token, pageId, graphVersion });
  const state = cursor === null ? null : codec.decode(cursor);
  const page = await readFacebookPosts({ token, pageId, graphVersion, after: state?.after });
  if (page.status !== "connected") return { status: page.status, posts: [], nextCursor: null };
  try {
    return { status: "connected", posts: page.posts, nextCursor: page.nextAfter === null ? null : codec.encode(page.nextAfter, state?.seen) };
  } catch (error) {
    // A repeated upstream cursor is a feed failure, not invalid caller input.
    if (error instanceof InvalidNewsCursorError) return { status: "unavailable", posts: [], nextCursor: null };
    throw error;
  }
}
