import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";

import { THEME_SCRIPT } from "@/lib/theme";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const description =
  "KineticVM gives every robot, drone and sensor an onchain identity and signs what it does on Monad, so owners can sell machine data that buyers verify for themselves.";

export const metadata: Metadata = {
  metadataBase: new URL("https://kineticvm.xyz"),
  title: "KineticVM · Verifiable data from physical AI",
  description,
  applicationName: "KineticVM",
  openGraph: {
    type: "website",
    siteName: "KineticVM",
    url: "https://kineticvm.xyz",
    images: [{ url: "/og-home.png", width: 1200, height: 630, alt: "KineticVM homepage" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-home.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#fbfaf9",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
