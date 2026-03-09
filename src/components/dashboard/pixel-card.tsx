// src/components/dashboard/pixel-card.tsx
export function PixelCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border-2 border-[#4A3326] bg-white p-4 shadow-[4px_4px_0_#4A3326] ${className}`}
    >
      {children}
    </div>
  );
}
