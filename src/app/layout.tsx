import type { Metadata } from "next";
import { Geist, Geist_Mono, Press_Start_2P } from "next/font/google";
import Script from "next/script";
import { PostHogProvider } from "@/components/posthog-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pressStart2P = Press_Start_2P({
  variable: "--font-press-start",
  weight: "400",
  subsets: ["latin"],
});

import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "brag.fast — Auto-generate social images for your launches",
  description:
    "Generate branded social media images from your releases. One API call or GitHub integration — landscape, square, and portrait formats in seconds.",
  alternates: { canonical: siteUrl },
  openGraph: {
    title: "brag.fast — Auto-generate social images for your launches",
    description:
      "Generate branded social media images from your releases. One API call or GitHub integration — landscape, square, and portrait formats in seconds.",
    url: siteUrl,
    siteName: "brag.fast",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "brag.fast — Auto-generate social images for your launches",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "brag.fast — Auto-generate social images for your launches",
    description:
      "Generate branded social media images from your releases. One API call or GitHub integration — landscape, square, and portrait formats in seconds.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/favicon/apple-touch-icon.png",
  },
  manifest: "/favicon/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${pressStart2P.variable} antialiased`}
      >
        <PostHogProvider>{children}</PostHogProvider>
        <Script
          id="org-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "brag.fast",
              url: siteUrl,
              logo: `${siteUrl}/logo.svg`,
            }),
          }}
        />
      </body>
    </html>
  );
}
