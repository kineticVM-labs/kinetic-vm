export default function DatasetLoading() {
  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-6 pt-4 pb-28 lg:grid-cols-[minmax(0,1fr)_22.5rem]" aria-busy="true" aria-live="polite">
      <div>
        <p className="text-sm text-muted">Loading dataset</p>
        <div className="mt-6 h-10 w-2/3 max-w-md animate-pulse rounded-xl bg-lilac motion-reduce:animate-none" />
        <div className="mt-4 h-20 max-w-xl animate-pulse rounded-xl bg-lilac motion-reduce:animate-none" />
        <div className="mt-10 h-40 max-w-3xl animate-pulse rounded-xl bg-lilac motion-reduce:animate-none" />
      </div>
      <div className="h-80 animate-pulse rounded-2xl bg-lilac motion-reduce:animate-none" />
    </div>
  );
}
