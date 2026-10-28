import { readFile } from "node:fs/promises";
import { join } from "node:path";

export async function GET(request: Request) {
  if (new URL(request.url).searchParams.has("fail")) return new Response(null, { status: 404 });
  await new Promise((resolve) => setTimeout(resolve, 25000));
  const bytes = await readFile(join(process.cwd(), "public/images/blues-deluxe-2026-10-24.jpg"));
  return new Response(bytes, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store" } });
}
