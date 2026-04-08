// src/components/admin/pixel-card.tsx
export function PixelCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border-2 border-brand bg-white p-4 shadow-[4px_4px_0_var(--color-brand)] ${className}`}
    >
      {children}
    </div>
  );
}
