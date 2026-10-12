import type { ReactNode } from "react";

import { Reveal } from "@/components/home/reveal";

export function Eyebrow({ children, tone = "light" }: { children: ReactNode; tone?: "light" | "dark" }) {
  return (
    <p
      className={`inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] ${
        tone === "dark" ? "text-[#b9abff]" : "text-purple-deep"
      }`}
    >
      <span className={`size-1.5 rounded-[2px] ${tone === "dark" ? "bg-[#b9abff]" : "bg-purple"}`} aria-hidden="true" />
      {children}
    </p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  body,
  align = "left",
  tone = "light",
}: {
  eyebrow: string;
  title: ReactNode;
  body?: ReactNode;
  align?: "left" | "center";
  tone?: "light" | "dark";
}) {
  const centered = align === "center";
  return (
    <Reveal className={centered ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <Eyebrow tone={tone}>{eyebrow}</Eyebrow>
      <h2
        className={`mt-5 text-4xl font-semibold leading-[1.08] tracking-[-0.03em] sm:text-5xl ${
          tone === "dark" ? "text-white" : "text-ink"
        }`}
      >
        {title}
      </h2>
      {body ? (
        <p className={`mt-5 text-lg leading-8 ${tone === "dark" ? "text-white/70" : "text-fg"}`}>{body}</p>
      ) : null}
    </Reveal>
  );
}

export function Accent({ children }: { children: ReactNode }) {
  return <span className="font-serif text-[1.1em] font-normal italic tracking-normal text-purple">{children}</span>;
}
