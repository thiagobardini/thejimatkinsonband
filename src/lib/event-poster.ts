const maximumBytes = 4 * 1024 * 1024;
type PosterFetch = (url: string, init: RequestInit & { next: { revalidate: number } }) => Promise<Response>;

export async function readEventPoster(source: string | null, fetcher: PosterFetch = fetch): Promise<{ bytes: ArrayBuffer; type: string } | null> {
  if (!source) return null;
  try {
    const url = new URL(source);
    const host = url.hostname;
    if (url.protocol !== "https:" || url.username || url.password || url.port ||
      !["fbcdn.net", "fbsbx.com"].some((domain) => host === domain || host.endsWith(`.${domain}`))) return null;
    const response = await fetcher(url.href, {
      redirect: "error", cache: "force-cache", next: { revalidate: 900 }, signal: AbortSignal.timeout(8_000),
    });
    const type = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
    if (!response.ok || !type || !["image/jpeg", "image/png", "image/webp"].includes(type) ||
      Number(response.headers.get("content-length")) > maximumBytes) return null;
    // Bound the streamed body as well: a missing or false Content-Length must not bypass the limit.
    const reader = response.body?.getReader();
    if (!reader) return null;
    const chunks: Uint8Array[] = [];
    let length = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > maximumBytes) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    if (!length) return null;
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return { bytes: bytes.buffer, type };
  } catch {
    return null;
  }
}
