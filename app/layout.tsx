import type { Metadata, Viewport } from "next";
import { Outfit, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { JsonLd } from "@/components/seo/json-ld";
import { AppProviders } from "@/providers/app-providers";
import { SITE } from "@/lib/constants";
import { Analytics } from "@vercel/analytics/next"

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} · ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description:
    "Discover clubs, rooftops, live music, and student nights in Prishtina. Live atmosphere, reservations, guestlists, and tickets — nightlife built for Kosovo.",
  keywords: [
    "Prishtina nightlife",
    "events Prishtina tonight",
    "clubs Prishtina",
    "Kosovo events",
    "live music Kosovo",
  ],
  openGraph: {
    type: "website",
    locale: "en_XK",
    url: SITE.url,
    siteName: SITE.name,
    title: `${SITE.name} · ${SITE.tagline}`,
    description: "What’s happening tonight in Prishtina — on NEYA.",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.name,
    description: SITE.tagline,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full w-full" suppressHydrationWarning>
      <body
        className={`${outfit.variable} ${geistSans.variable} ${geistMono.variable} min-h-full w-full min-w-0 bg-[var(--background)] font-sans text-[var(--foreground)] antialiased`}
      >
        <AppProviders>
          <JsonLd />
          <div className="flex min-h-full w-full min-w-0 flex-col">{children}</div>
        </AppProviders>

        {/* VERCEL ANALYTICS */}
      <Analytics />
      </body>
    </html>
  );
}
