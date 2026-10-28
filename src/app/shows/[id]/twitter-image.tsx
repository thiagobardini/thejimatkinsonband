import { createEventSocialImage } from "@/lib/event-social-image";

export const alt = "Live show poster — The Jim Atkinson Band";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 900;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  return createEventSocialImage((await params).id);
}
