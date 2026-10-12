export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-6 pt-4 pb-24" aria-busy="true" aria-live="polite">
      <p className="text-sm text-muted">Loading datasets</p>
      <div className="mt-8 h-12 w-2/3 max-w-xl animate-pulse rounded-2xl bg-lilac motion-reduce:animate-none" />
      <div className="mt-8 divide-y divide-line border-y border-line">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="flex items-center gap-4 py-4">
            <div className="size-[3.25rem] shrink-0 animate-pulse rounded-xl bg-lilac motion-reduce:animate-none" />
            <div className="min-w-0 flex-1">
              <div className="h-4 w-48 animate-pulse rounded bg-lilac motion-reduce:animate-none" />
              <div className="mt-2 h-3 w-full max-w-md animate-pulse rounded bg-lilac motion-reduce:animate-none" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}