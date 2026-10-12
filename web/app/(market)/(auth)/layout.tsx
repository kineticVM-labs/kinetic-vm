import { Logo } from "@/components/logo";
import { links } from "@/lib/links";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-6 pt-6 sm:px-10">
        <a
          href={links.marketplace}
          aria-label="Marketplace home"
          className="inline-flex rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple"
        >
          <Logo />
        </a>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
