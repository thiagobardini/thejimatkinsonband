import { BandEvents } from "@/components/band-events";
import type { BandEvent } from "@/lib/facebook-events";

export default async function LoadingPreview({ searchParams }: { searchParams: Promise<{ count?: string; run?: string }> }) {
  const { count = "3", run = "1" } = await searchParams;
  const events: BandEvent[] = Array.from({ length: Number(count) }, (_, i) => ({
    id: String(i + 1), title: i === 1 ? "The Jim Atkinson Band — A night of blues, rock, and roots music" : "Jim Atkinson Band Live",
    startsAt: `2026-12-${String(i + 10).padStart(2, "0")}T19:00:00-05:00`, endsAt: null,
    venue: "Local stage", location: "Massachusetts", eventUrl: "https://www.facebook.com/",
    coverUrl: i === 0 ? `/loading-preview/artwork?run=${run}` : i === 2 ? "/loading-preview/artwork?fail=1" : "/images/blues-deluxe-2026-10-24.jpg",
  }));
  return <><p style={{ padding: 20, color: "#a0b0b8" }}>LOCAL LAYOUT PREVIEW · SAMPLE EVENTS</p><BandEvents events={[...events].reverse()} pastEvents={events} status="connected" /></>;
}
