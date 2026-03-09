"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Brands", href: "/dashboard/brands" },
  { label: "History", href: "/dashboard/history" },
  { label: "Keys", href: "/dashboard/keys" },
];

function PixelHamburger({
  open,
  onClick,
}: {
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative md:hidden h-8 w-8 border-2 border-[#4A3326] bg-[#FFF8F0] shadow-[2px_2px_0_#4A3326] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
      aria-label={open ? "Close menu" : "Open menu"}
    >
      {/* Three pixel bars that morph into X */}
      <span
        className={`absolute left-1.5 block h-[2px] w-3 bg-[#4A3326] transition-all duration-200 ${
          open ? "top-[13px] rotate-45" : "top-[8px]"
        }`}
      />
      <span
        className={`absolute left-1.5 top-[13px] block h-[2px] w-3 bg-[#4A3326] transition-opacity duration-200 ${
          open ? "opacity-0" : "opacity-100"
        }`}
      />
      <span
        className={`absolute left-1.5 block h-[2px] w-3 bg-[#4A3326] transition-all duration-200 ${
          open ? "top-[13px] -rotate-45" : "top-[18px]"
        }`}
      />
    </button>
  );
}

export function DashboardNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close menu on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Desktop nav */}
      <nav className="hidden md:flex gap-1">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`
                font-[family-name:var(--font-press-start)] text-xs px-3 py-2 whitespace-nowrap
                border-2 border-[#4A3326]
                transition-all
                ${
                  isActive
                    ? "bg-[#F8AF3C] text-[#4A3326] shadow-[2px_2px_0_#4A3326]"
                    : "bg-transparent text-[#4A3326] hover:bg-[#F8AF3C]/20 shadow-[3px_3px_0_#4A3326] hover:shadow-[2px_2px_0_#4A3326]"
                }
              `}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* Hamburger button */}
      <div className="ml-auto md:hidden">
        <PixelHamburger open={open} onClick={() => setOpen(!open)} />
      </div>

      {/* Mobile slide-out overlay */}
      <div
        className={`fixed inset-0 z-[60] bg-[#4A3326]/40 transition-opacity duration-200 md:hidden ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setOpen(false)}
      />

      {/* Mobile slide-out panel */}
      <div
        className={`fixed top-0 right-0 z-[70] h-full w-64 bg-[#FFF8F0] border-l-2 border-[#4A3326] shadow-[-6px_0_0_#4A3326] transition-transform duration-250 ease-out md:hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between border-b-2 border-[#4A3326] px-4 py-3">
          <span className="font-[family-name:var(--font-press-start)] text-[10px] text-[#4A3326]/60 uppercase tracking-wider">
            Menu
          </span>
          <PixelHamburger open={open} onClick={() => setOpen(false)} />
        </div>

        {/* Menu items */}
        <nav className="flex flex-col gap-2 p-4">
          {tabs.map((tab, i) => {
            const isActive =
              tab.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`
                  font-[family-name:var(--font-press-start)] text-xs px-4 py-3
                  border-2 border-[#4A3326]
                  transition-all
                  ${
                    isActive
                      ? "bg-[#F8AF3C] text-[#4A3326] shadow-[3px_3px_0_#4A3326]"
                      : "bg-white text-[#4A3326] shadow-[3px_3px_0_#4A3326] hover:bg-[#F8AF3C]/20"
                  }
                `}
                style={{
                  animationDelay: open ? `${i * 50}ms` : "0ms",
                }}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {/* Decorative pixel art at bottom */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center">
          <span className="font-[family-name:var(--font-press-start)] text-[8px] text-[#4A3326]/20 tracking-widest">
            ........
          </span>
        </div>
      </div>
    </>
  );
}
