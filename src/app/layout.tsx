import type { Metadata } from "next";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";
import "@fontsource/oswald/500.css";
import "@fontsource/oswald/600.css";
import "./globals.css";

const siteOrigin = process.env.SITE_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: "The Jim Atkinson Band | Blues, Rock & New Orleans Rhythms",
  description: "Good music. Good company. The Jim Atkinson Band brings blues, rock, and New Orleans rhythms to Central and Eastern Massachusetts. Get in touch for bookings.",
  openGraph: {
    title: "The Jim Atkinson Band",
    description: "Blues. Rock. New Orleans rhythms. Live in Massachusetts since 2017.",
    type: "website",
    locale: "en_US",
  },
  twitter: { card: "summary_large_image", title: "The Jim Atkinson Band", description: "Blues, rock, and New Orleans rhythms. Get in touch for bookings." },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
