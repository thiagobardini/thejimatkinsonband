import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

type CursorState = { after: string; seen: string[] };
type CursorScope = { token: string; pageId: string; graphVersion: string };

export class InvalidNewsCursorError extends Error {
  constructor() {
    super("This news cursor is invalid. Reload the news feed.");
    this.name = "InvalidNewsCursorError";
  }
}

function digest(value: string): string {
  return createHash("sha256").update(value).digest("base64url").slice(0, 24);
}

export function createPostsCursorCodec({ token, pageId, graphVersion }: CursorScope) {
  const scope = Buffer.from(`band-news:v1:${pageId}:${graphVersion}`);
  const key = createHash("sha256").update(scope).update("\0").update(token).digest();
  return {
    encode(after: string, seen: readonly string[] = []): string {
      if (!after.trim() || after.length > 2048 || after.includes(token) || seen.includes(digest(after))) throw new InvalidNewsCursorError();
      const history = [...seen.slice(-63), digest(after)];
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      cipher.setAAD(scope);
      const ciphertext = Buffer.concat([cipher.update(JSON.stringify({ a: after, h: history }), "utf8"), cipher.final()]);
      // No short expiry: an initial page can legitimately remain in Next's cached HTML.
      return `n1.${Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url")}`;
    },
    decode(cursor: string): CursorState {
      try {
        if (cursor.length > 8192 || !/^n1\.[A-Za-z0-9_-]+$/.test(cursor)) throw new InvalidNewsCursorError();
        const encoded = cursor.slice(3);
        const data = Buffer.from(encoded, "base64url");
        if (data.length < 29 || data.toString("base64url") !== encoded) throw new InvalidNewsCursorError();
        const decipher = createDecipheriv("aes-256-gcm", key, data.subarray(0, 12));
        decipher.setAAD(scope);
        decipher.setAuthTag(data.subarray(12, 28));
        const parsed: unknown = JSON.parse(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString("utf8"));
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new InvalidNewsCursorError();
        const { a, h } = parsed as Record<string, unknown>;
        if (typeof a !== "string" || !a.trim() || a.length > 2048 || a.includes(token)
          || !Array.isArray(h) || h.length < 1 || h.length > 64
          || h.some((item) => typeof item !== "string" || !/^[A-Za-z0-9_-]{24}$/.test(item))
          || new Set(h).size !== h.length || h[h.length - 1] !== digest(a)) throw new InvalidNewsCursorError();
        return { after: a, seen: h as string[] };
      } catch {
        throw new InvalidNewsCursorError();
      }
    },
  };
}
