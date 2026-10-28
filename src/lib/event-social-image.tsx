import "server-only";
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getBandEvent } from "./facebook";
import { readEventPoster } from "./event-poster";
import { eventDateLabel } from "./event-sharing";

export async function createEventSocialImage(id: string) {
  const event = await getBandEvent(id);
  if (!event) return new Response("Show not found", { status: 404 });
  const poster = await readEventPoster(event.coverUrl);
  if (poster) {
    return new ImageResponse(
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#101e28", alignItems: "center", justifyContent: "center" }}>
        <img src={`data:${poster.type};base64,${Buffer.from(poster.bytes).toString("base64")}`} width={1200} height={630} style={{ objectFit: "contain" }} alt="" />
      </div>, { width: 1200, height: 630 },
    );
  }
  const font = await readFile(join(process.cwd(), "node_modules/@fontsource/outfit/files/outfit-latin-400-normal.woff"));
  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%", padding: 80, background: "#101e28", color: "#eee9dd", fontFamily: "Outfit" }}>
      <div style={{ display: "flex", color: "#c8ab79", fontSize: 22, letterSpacing: 4 }}>THE JIM ATKINSON BAND · LIVE</div>
      <div style={{ display: "flex", marginTop: 28, fontSize: event.title.length > 90 ? 40 : 52, lineHeight: 1.15 }}>{event.title.length > 160 ? `${event.title.slice(0, 157)}…` : event.title}</div>
      <div style={{ display: "flex", marginTop: 30, fontSize: 26, color: "#c8ab79" }}>{eventDateLabel(event)}</div>
      {(event.venue || event.location) && <div style={{ display: "flex", marginTop: 14, fontSize: 23, color: "#a0b0b8" }}>{(event.venue || event.location)?.slice(0, 100)}</div>}
      <div style={{ display: "flex", marginTop: 32, fontSize: 20, color: "#a0b0b8" }}>thejimatkinsonband.com</div>
    </div>, { width: 1200, height: 630, fonts: [{ name: "Outfit", data: font, weight: 400, style: "normal" }] },
  );
}
