import { getBandPosts, InvalidNewsCursorError } from "@/lib/facebook-posts-server";

const headers = {
  "Cache-Control": "no-store",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
};

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  if (params.getAll("cursor").length > 1 || [...params.keys()].some((key) => key !== "cursor")) {
    return Response.json({ error: "Invalid news request." }, { status: 400, headers });
  }
  try {
    const page = await getBandPosts(params.get("cursor"));
    return Response.json(page, { status: page.status === "connected" ? 200 : 503, headers });
  } catch (error) {
    if (error instanceof InvalidNewsCursorError) return Response.json({ error: "Reload the news feed to continue." }, { status: 400, headers });
    return Response.json({ error: "News is temporarily unavailable." }, { status: 503, headers });
  }
}
