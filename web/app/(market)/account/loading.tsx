export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <p className="text-sm text-muted">Loading overview</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-2xl bg-lilac motion-reduce:animate-none" />
        ))}
      </div>
      <div className="mt-4 h-72 animate-pulse rounded-2xl bg-lilac motion-reduce:animate-none" />
    </div>
  );
}
