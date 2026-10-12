import type { ReactNode } from "react";

export function DashboardHeading({ title, detail, action }: { title: string; detail?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink">{title}</h1>
        {detail ? <p className="mt-1 max-w-xl text-sm leading-6 text-muted">{detail}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function DashboardEmpty({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return (
    <div className="mt-8 flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface px-6 py-16 text-center">
      <h2 className="text-lg font-semibold tracking-[-0.02em] text-ink">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{detail}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
