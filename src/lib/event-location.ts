export function getEventLocation({ venue, location }: { venue?: string | null; location?: string | null }): { label: string; mapUrl: string } | null {
  const parts = [venue?.trim(), location?.trim()].filter((part): part is string => Boolean(part));
  if (parts.length === 0) return null;

  const query = new URLSearchParams({ api: "1", query: parts.join(", ") });
  return {
    label: parts.join(" · "),
    mapUrl: `https://www.google.com/maps/search/?${query}`,
  };
}
