import type { ReactNode } from "react";

export function PixelEventCard({
  header,
  children,
  meta,
  actions,
  testId,
  dataAttrs,
}: {
  header: ReactNode;
  children: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  testId?: string;
  dataAttrs?: Record<string, string>;
}) {
  return (
    <article
      data-testid={testId}
      {...dataAttrs}
      className="border-2 border-brand bg-white shadow-[4px_4px_0_var(--color-brand)]"
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b-2 border-brand bg-gold/20 px-4 py-2">
        {header}
      </header>
      <div className="space-y-3 px-4 py-3">{children}</div>
      {meta ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-brand/10 px-4 py-2 font-[family-name:var(--font-geist-mono)] text-[11px] text-brand/55">
          {meta}
        </div>
      ) : null}
      {actions ? (
        <footer className="flex flex-wrap justify-end gap-2 border-t-2 border-brand bg-surface px-4 py-2">
          {actions}
        </footer>
      ) : null}
    </article>
  );
}

export function PixelEventList({ children }: { children: ReactNode }) {
  return <div className="space-y-3">{children}</div>;
}
