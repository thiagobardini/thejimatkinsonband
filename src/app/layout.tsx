import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";
import "@fontsource/oswald/500.css";
import "@fontsource/oswald/600.css";
import "./globals.css";
import { siteOrigin } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  applicationName: "The Jim Atkinson Band",
  title: "The Jim Atkinson Band | Blues, Rock & Roots Music",
  description: "Good music. Good company. The Jim Atkinson Band brings blues, rock, and roots music to Central and Eastern Massachusetts. Get in touch for bookings.",
  openGraph: {
    title: "The Jim Atkinson Band",
    siteName: "The Jim Atkinson Band",
    url: "/",
    description: "Blues. Rock. Roots Music. Live in Massachusetts since 2017.",
    type: "website",
    locale: "en_US",
  },
  twitter: { card: "summary_large_image", title: "The Jim Atkinson Band", description: "Blues, rock, and roots music. Get in touch for bookings." },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
