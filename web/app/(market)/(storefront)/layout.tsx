import { MarketplaceFrame } from "@/components/marketplace/frame";

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return <MarketplaceFrame>{children}</MarketplaceFrame>;
}
