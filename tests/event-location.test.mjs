import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";

const locationModule = new URL("../src/lib/event-location.ts", import.meta.url);
const providers = [
  { name: "Google Maps", origin: "https://www.google.com", path: "/maps/search/", queryKey: "query", parameterKeys: ["api", "query"] },
  { name: "Waze", origin: "https://waze.com", path: "/ul", queryKey: "q", parameterKeys: ["q"] },
  { name: "Apple Maps", origin: "https://maps.apple.com", path: "/search", queryKey: "query", parameterKeys: ["query"] },
];

async function locations() {
  assert.ok(existsSync(locationModule), "Event map links are not implemented yet");
  return import(locationModule.href);
}

test("all three map choices use the trimmed venue and address while preserving the display label", async () => {
  const { getEventLocation } = await locations();
  const result = getEventLocation({ venue: "  SSB Clinton  ", location: "  175 Sterling St, Clinton, MA 01510  " });

  assert.equal(result.label, "SSB Clinton · 175 Sterling St, Clinton, MA 01510");
  assert.deepEqual(result.links, [
    { name: "Google Maps", href: "https://www.google.com/maps/search/?api=1&query=SSB+Clinton%2C+175+Sterling+St%2C+Clinton%2C+MA+01510" },
    { name: "Waze", href: "https://waze.com/ul?q=SSB%20Clinton%2C%20175%20Sterling%20St%2C%20Clinton%2C%20MA%2001510" },
    { name: "Apple Maps", href: "https://maps.apple.com/search?query=SSB%20Clinton%2C%20175%20Sterling%20St%2C%20Clinton%2C%20MA%2001510" },
  ]);
  assert.equal("mapUrl" in result, false);
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
    assert.ok(Array.isArray(result.links), "Map provider choices are available");
    for (const provider of providers) {
      const choice = result.links.find((link) => link.name === provider.name);
      assert.ok(choice, `${provider.name} is available`);
      assert.equal(new URL(choice.href).searchParams.get(provider.queryKey), label);
    }
  }
});

test("missing or blank places do not produce a map link", async () => {
  const { getEventLocation } = await locations();
  for (const event of [{}, { venue: null, location: null }, { venue: "", location: "" }, { venue: " \t ", location: " \n " }]) {
    assert.equal(getEventLocation(event), null);
  }
});

test("each map choice preserves Unicode and punctuation without creating extra URL parameters", async () => {
  const { getEventLocation } = await locations();
  const result = getEventLocation({ venue: "Café O'Connor & Sons #2?", location: "12 Main St + Annex, Montréal, QC %2F" });

  assert.equal(result.label, "Café O'Connor & Sons #2? · 12 Main St + Annex, Montréal, QC %2F");
  assert.ok(Array.isArray(result.links), "Map provider choices are available");
  for (const provider of providers) {
    const map = new URL(result.links.find((link) => link.name === provider.name).href);
    assert.equal(map.searchParams.get(provider.queryKey), "Café O'Connor & Sons #2?, 12 Main St + Annex, Montréal, QC %2F");
    assert.deepEqual([...map.searchParams.keys()], provider.parameterKeys);
    assert.equal(map.hash, "");
  }
});

test("URL-shaped and query-shaped place text cannot replace a provider origin or inject parameters", async () => {
  const { getEventLocation } = await locations();
  const result = getEventLocation({ location: "https://example.com/venue?api=2&url=https://elsewhere.test#place" });

  assert.ok(Array.isArray(result.links), "Map provider choices are available");
  for (const provider of providers) {
    const map = new URL(result.links.find((link) => link.name === provider.name).href);
    assert.equal(map.origin, provider.origin);
    assert.equal(map.pathname, provider.path);
    assert.equal(map.searchParams.get(provider.queryKey), "https://example.com/venue?api=2&url=https://elsewhere.test#place");
    assert.deepEqual([...map.searchParams.keys()], provider.parameterKeys);
    assert.equal(map.searchParams.get("url"), null);
    assert.equal(map.hash, "");
  }
  assert.equal(new URL(result.links[0].href).searchParams.get("api"), "1");
});
