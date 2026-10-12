import Image from "next/image";

export function Logo({ tone = "light", wordmark = true }: { tone?: "light" | "dark"; wordmark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Image
        src="/kinetic-icon.png"
        alt=""
        width={28}
        height={28}
        sizes="28px"
        className="size-7 shrink-0"
      />
      <span className={`text-[19px] font-semibold tracking-tight ${tone === "dark" ? "text-white" : "text-ink"} ${wordmark ? "" : "max-sm:sr-only"}`}>
        Kinetic<span className="text-purple">VM</span>
      </span>
    </span>
  );
}
