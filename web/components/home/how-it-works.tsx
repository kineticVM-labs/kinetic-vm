import { Reveal } from "@/components/home/reveal";
import { Accent, SectionHeading } from "@/components/home/section-heading";

const STEPS = [
  {
    title: "Install the runtime",
    body: "One command on a Raspberry Pi, a Linux box or a Mac. Quickstart creates the device signing key, which never leaves the machine.",
  },
  {
    title: "Claim it and set limits",
    body: "The device sends its owner a claim link on Telegram. One confirmation mints the ERC-8004 identity into the owner's wallet and sets the vault's spending caps.",
  },
  {
    title: "Let it work",
    body: "The agent sells, moves and measures. Every action becomes an attestation signed by the device and recorded on Monad.",
  },
  {
    title: "Sell its history",
    body: "Records build up under one identity. Package them as a dataset, and buyers verify each row against the chain before they pay.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-24 py-28 sm:py-36">
      <div className="mx-auto grid max-w-7xl gap-16 px-6 lg:grid-cols-[1fr_1.1fr] lg:gap-20 [&>*]:min-w-0">
        <div>
          <SectionHeading
            eyebrow="How it works"
            title={
              <>
                From unboxed to <Accent>earning</Accent> in four steps.
              </>
            }
          />
          <ol className="mt-12 space-y-2">
            {STEPS.map((step, index) => (
              <Reveal key={step.title} delay={0.06 * index}>
                <li className="relative flex gap-5 rounded-2xl p-4 transition-colors duration-200 hover:bg-surface">
                  <span className="grid size-9 flex-none place-items-center rounded-full border border-lilac-strong bg-surface font-mono text-sm text-purple-deep">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold tracking-[-0.015em] text-ink">{step.title}</h3>
                    <p className="mt-1.5 text-[15px] leading-7 text-fg">{step.body}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
        <Reveal className="lg:sticky lg:top-28 lg:self-start" delay={0.1}>
          <Terminal />
        </Reveal>
      </div>
    </section>
  );
}

function Terminal() {
  return (
    <div className="overflow-hidden rounded-3xl bg-[#14002f] shadow-[0_40px_80px_-40px_rgba(32,0,82,0.6)] ring-1 ring-[#2b1260]">
      <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3.5">
        <span className="size-3 rounded-full bg-white/15" />
        <span className="size-3 rounded-full bg-white/15" />
        <span className="size-3 rounded-full bg-white/15" />
        <span className="ml-3 font-mono text-xs text-white/45">pi@vending-01 ~</span>
      </div>
      <pre className="overflow-x-auto px-5 py-6 font-mono text-[13px] leading-7 text-white/80">
        <code>
          <Line prompt>curl -fsSL …/install.sh | sh</Line>
          <Line tone="ok">✓ kinetic installed to ~/.local/bin</Line>
          <Line> </Line>
          <Line prompt>kinetic quickstart</Line>
          <Line tone="dim">› device key        created, stays on this machine</Line>
          <Line tone="dim">› network           Monad testnet · 10143</Line>
          <Line tone="dim">› limits            2 MON per tx · 25 MON per day</Line>
          <Line tone="ok">✓ claim link sent to the owner on Telegram</Line>
          <Line> </Line>
          <Line prompt>kinetic agent -a vending-01</Line>
          <Line tone="accent">● vend slot B4       attested 0x7c1e…09ab</Line>
          <Line tone="accent">● paid supplier 1.2  within today&apos;s cap</Line>
        </code>
      </pre>
    </div>
  );
}

function Line({ children, prompt, tone }: { children: React.ReactNode; prompt?: boolean; tone?: "ok" | "dim" | "accent" }) {
  const color = tone === "ok" ? "text-[#86efac]" : tone === "dim" ? "text-white/55" : tone === "accent" ? "text-[#c4b8ff]" : "text-white";
  return (
    <span className={`block ${color}`}>
      {prompt ? <span className="select-none text-[#9d8bff]">$ </span> : null}
      {children}
    </span>
  );
}
