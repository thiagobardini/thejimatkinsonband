import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

const locationModule = new URL("../src/lib/event-location.ts", import.meta.url);

async function locations() {
  assert.ok(existsSync(locationModule), "Event map links are not implemented yet");
  return import(locationModule.href);
}

test("map links combine the trimmed venue and address while preserving the display label", async () => {
  const { getEventLocation } = await locations();
  const result = getEventLocation({ venue: "  SSB Clinton  ", location: "  175 Sterling St, Clinton, MA 01510  " });

  assert.equal(result.label, "SSB Clinton · 175 Sterling St, Clinton, MA 01510");
  const map = new URL(result.mapUrl);
  assert.equal(map.origin, "https://www.google.com");
  assert.equal(map.pathname, "/maps/search/");
  assert.equal(map.searchParams.get("api"), "1");
  assert.equal(map.searchParams.get("query"), "SSB Clinton, 175 Sterling St, Clinton, MA 01510");
});

test("map links use a venue or address on its own without an empty separator", async () => {
  const { getEventLocation } = await locations();
  for (const { event, label } of [
    { event: { venue: " SSB Clinton " }, label: "SSB Clinton" },
    { event: { venue: null, location: " 175 Sterling St, Clinton, MA 01510 " }, label: "175 Sterling St, Clinton, MA 01510" },
    { event: { venue: " \t ", location: " Clinton, MA " }, label: "Clinton, MA" },
    { event: { venue: " SSB Clinton ", location: " \n " }, label: "SSB Clinton" },
  ]) {
    const result = getEventLocation(event);
    assert.equal(result.label, label);
    assert.equal(new URL(result.mapUrl).searchParams.get("query"), label);
  }
});

test("missing or blank places do not produce a map link", async () => {
  const { getEventLocation } = await locations();
  for (const event of [{}, { venue: null, location: null }, { venue: "", location: "" }, { venue: " \t ", location: " \n " }]) {
    assert.equal(getEventLocation(event), null);
  }
});

test("map queries preserve Unicode and punctuation without creating extra URL parameters", async () => {
  const { getEventLocation } = await locations();
  const result = getEventLocation({ venue: "Café O'Connor & Sons #2?", location: "12 Main St + Annex, Montréal, QC" });

  assert.equal(result.label, "Café O'Connor & Sons #2? · 12 Main St + Annex, Montréal, QC");
  const map = new URL(result.mapUrl);
  assert.equal(map.searchParams.get("query"), "Café O'Connor & Sons #2?, 12 Main St + Annex, Montréal, QC");
  assert.deepEqual([...map.searchParams.keys()], ["api", "query"]);
  assert.equal(map.hash, "");
});

test("URL-shaped place text remains a search query on Google Maps", async () => {
  const { getEventLocation } = await locations();
  const result = getEventLocation({ location: "https://example.com/venue?destination=elsewhere#place" });
  const map = new URL(result.mapUrl);

  assert.equal(map.origin, "https://www.google.com");
  assert.equal(map.pathname, "/maps/search/");
  assert.equal(map.searchParams.get("query"), "https://example.com/venue?destination=elsewhere#place");
});
