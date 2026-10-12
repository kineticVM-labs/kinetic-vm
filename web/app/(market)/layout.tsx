import type { Metadata } from "next";

import { MarketTheme } from "@/components/marketplace/market-theme";
import { Providers } from "@/components/providers";

const description =
  "Machine data you can check. Owners list what their devices signed on Monad. Buyers verify the rows, pay in MON, then download the file.";

export const metadata: Metadata = {
  description,
  openGraph: {
    siteName: "KineticVM",
    url: "https://marketplace.kineticvm.xyz",
    images: [{ url: "/og-marketplace.png", width: 1200, height: 630, alt: "KineticVM marketplace" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-marketplace.png"],
  },
};

export const dynamic = "force-dynamic";

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return (
    <MarketTheme>
      <Providers>{children}</Providers>
    </MarketTheme>
  );
}
