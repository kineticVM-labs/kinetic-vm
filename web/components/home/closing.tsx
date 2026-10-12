import { Reveal } from "@/components/home/reveal";
import { Logo } from "@/components/logo";
import { SmartLink } from "@/components/smart-link";
import { ArrowRight } from "@/components/icons";
import { links } from "@/lib/links";

export function ClosingCta({ claim }: { claim: string }) {
  return (
    <section className="px-4 py-24 sm:px-6 sm:py-32">
      <Reveal className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#8c79fa] via-[#6d55f3] to-[#3d1aa8] px-8 py-20 text-center sm:px-16 sm:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.22)_1px,transparent_1px)] bg-[size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,#000,transparent_70%)]" />
        <div className="pointer-events-none absolute -top-32 left-1/2 size-[30rem] -translate-x-1/2 rounded-full bg-white/20 blur-[100px]" />
        <div className="relative">
          <h2 className="mx-auto max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-0.035em] text-white sm:text-6xl">
            Your machines already make data. Make it{" "}
            <span className="font-serif text-[1.1em] font-normal italic tracking-normal">worth</span> something.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-white/80">
            Machines act. Actions become attestations. Attestations become datasets. Datasets become revenue.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <SmartLink href={claim} className="btn btn-lg group bg-white text-night shadow-[0_12px_30px_-12px_rgba(32,0,82,0.6)] hover:bg-lilac">
              Claim a device
              <ArrowRight width={18} height={18} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </SmartLink>
            <a href={links.docs} className="btn btn-lg btn-on-dark">
              Read docs
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

const COLUMNS = [
  {
    title: "Product",
    items: [
      { label: "Identity", href: "#product" },
      { label: "Vault", href: "#product" },
      { label: "Attestations", href: "#proof" },
      { label: "Marketplace", href: links.marketplace },
    ],
  },
  {
    title: "Build",
    items: [
      { label: "Docs", href: links.docs },
      { label: "GitHub", href: links.github },
      { label: "Plugins", href: "#builders" },
    ],
  },
  {
    title: "Community",
    items: [{ label: "X", href: links.x }],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-6 text-muted">
            Verifiable data from physical AI. Identity, signed actions and spending limits for every machine.
          </p>
        </div>
        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <p className="text-sm font-semibold text-ink">{column.title}</p>
            <ul className="mt-4 space-y-2.5">
              {column.items.map((item) => (
                <li key={item.label}>
                  <a href={item.href} className="text-sm text-muted transition-colors duration-150 hover:text-ink">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-6 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 KineticVM. Built on Monad.</p>
          <p>The agent runtime is a modified fork of ZeroClaw (MIT OR Apache-2.0).</p>
        </div>
      </div>
    </footer>
  );
}
