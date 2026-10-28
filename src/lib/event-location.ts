export function getEventLocation({ venue, location }: { venue?: string | null; location?: string | null }): {
  label: string;
  links: Array<{ name: "Google Maps" | "Waze" | "Apple Maps"; href: string }>;
} | null {
  const parts = [venue?.trim(), location?.trim()].filter((part): part is string => Boolean(part));
  if (parts.length === 0) return null;

  const query = parts.join(", ");
  const googleQuery = new URLSearchParams({ api: "1", query });
  const encodedQuery = encodeURIComponent(query);
  return {
    label: parts.join(" · "),
    links: [
      { name: "Google Maps", href: `https://www.google.com/maps/search/?${googleQuery}` },
      { name: "Waze", href: `https://waze.com/ul?q=${encodedQuery}` },
      { name: "Apple Maps", href: `https://maps.apple.com/search?query=${encodedQuery}` },
    ],
  };
}
