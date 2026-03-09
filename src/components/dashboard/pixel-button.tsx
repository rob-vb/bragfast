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
    "font-[family-name:var(--font-press-start)] text-xs px-4 py-2 border-2 border-[#4A3326] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-[#F8AF3C] text-[#4A3326] shadow-[4px_4px_0_#4A3326] hover:shadow-[2px_2px_0_#4A3326]",
    danger:
      "bg-red-500 text-white shadow-[4px_4px_0_#4A3326] hover:shadow-[2px_2px_0_#4A3326]",
    ghost:
      "bg-transparent text-[#4A3326] shadow-[4px_4px_0_#4A3326] hover:bg-[#F8AF3C]/20 hover:shadow-[2px_2px_0_#4A3326]",
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
