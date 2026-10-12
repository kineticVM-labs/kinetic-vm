import Image from "next/image";

import { DataIcon } from "@/components/icons";

export function DatasetCover({
  image,
  sizes,
  className,
  compact = false,
  alt = "",
  priority = false,
  intrinsic = false,
}: {
  image: string | null;
  sizes: string;
  className?: string;
  compact?: boolean;
  alt?: string;
  priority?: boolean;
  /** Use the file's own height. The filled frame crops to whatever box the caller sets. */
  intrinsic?: boolean;
}) {
  if (intrinsic) {
    return (
      <div className={`overflow-hidden bg-lilac ${className ?? ""}`}>
        {image ? (
          // The file decides the height. next/image would lock a width/height ratio before the bytes arrive.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={alt} fetchPriority={priority ? "high" : "auto"} className="block h-auto w-full" />
        ) : (
          <div className="relative aspect-square">
            <DatasetMark compact={compact} />
          </div>
        )}
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden bg-lilac ${className ?? ""}`}>
      {image ? <CoverImage image={image} sizes={sizes} alt={alt} priority={priority} /> : <DatasetMark compact={compact} />}
    </div>
  );
}

function CoverImage({ image, sizes, alt, priority }: { image: string; sizes: string; alt: string; priority: boolean }) {
  const frame =
    "object-cover transition duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100";
  if (image.startsWith("/")) {
    return <Image src={image} alt={alt} fill sizes={sizes} priority={priority} className={frame} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- cover URLs use the operator's IPFS gateway
    <img src={image} alt={alt} loading={priority ? "eager" : "lazy"} className={`absolute inset-0 h-full w-full ${frame}`} />
  );
}

function DatasetMark({ compact }: { compact: boolean }) {
  return (
    <div className="absolute inset-0">
      <div className="dot-grid absolute inset-0 opacity-80" />
      <div className="relative flex h-full flex-col items-center justify-center">
        <span
          className={`grid place-items-center border border-lilac-strong bg-surface text-purple ${compact ? "size-9 rounded-lg" : "size-16 rounded-2xl shadow-[0_18px_40px_-24px_rgba(32,0,82,0.7)]"}`}
        >
          <DataIcon width={compact ? 18 : 30} height={compact ? 18 : 30} />
        </span>
        {compact ? null : <span className="mt-4 font-mono text-[11px] tracking-[0.18em] text-muted uppercase">Dataset</span>}
      </div>
    </div>
  );
}
