import { ButtonHTMLAttributes } from "react";

export function PixelButton({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "danger" | "ghost";
}) {
  const base =
    "font-[family-name:var(--font-press-start)] text-xs px-4 py-2 border-2 border-brand transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-gold text-brand shadow-[4px_4px_0_var(--color-brand)] hover:shadow-[2px_2px_0_var(--color-brand)]",
    danger:
      "bg-red-500 text-white shadow-[4px_4px_0_var(--color-brand)] hover:shadow-[2px_2px_0_var(--color-brand)]",
    ghost:
      "bg-transparent text-brand shadow-[4px_4px_0_var(--color-brand)] hover:bg-gold/20 hover:shadow-[2px_2px_0_var(--color-brand)]",
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
