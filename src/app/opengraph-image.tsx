import { createSocialImage } from "@/lib/brand-images";

export const alt = "The Jim Atkinson Band — blues, rock, and New Orleans rhythms in Massachusetts.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return createSocialImage();
}
