import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

async function brandDataUrl(filename: "band-emblem.png" | "band-logo-teal.png") {
  const image = await readFile(join(process.cwd(), "public", "brand", filename));
  return `data:image/png;base64,${image.toString("base64")}`;
}

export async function createBrandIcon(size: number) {
  const emblem = await brandDataUrl("band-emblem.png");

  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%" }}>
      <img src={emblem} width={size} height={size} alt="" />
    </div>,
    { width: size, height: size },
  );
}

export async function createSocialImage() {
  const [wordmark, font] = await Promise.all([
    brandDataUrl("band-logo-teal.png"),
    readFile(join(process.cwd(), "node_modules/@fontsource/outfit/files/outfit-latin-400-normal.woff")),
  ]);

  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", background: "#101e28", color: "#eee9dd", fontFamily: "Outfit", padding: "56px" }}>
      <img src={wordmark} width={960} height={321} alt="" />
      <div style={{ display: "flex", marginTop: "26px", fontSize: 34 }}>Good music. Good company.</div>
      <div style={{ display: "flex", marginTop: "14px", fontSize: 22, color: "#a0b0b8" }}>Central & Eastern Massachusetts · Since 2017</div>
    </div>,
    { width: 1200, height: 630, fonts: [{ name: "Outfit", data: font, style: "normal", weight: 400 }] },
  );
}
