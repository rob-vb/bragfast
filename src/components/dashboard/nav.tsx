"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

const tabs = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Brands", href: "/dashboard/brands" },
  { label: "Templates", href: "/dashboard/templates" },
  { label: "History", href: "/dashboard/history" },
  { label: "Account", href: "/dashboard/account" },
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
      className="relative md:hidden h-11 w-11 border-2 border-brand bg-surface shadow-[2px_2px_0_var(--color-brand)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all focus:outline-2 focus:outline-offset-2 focus:outline-gold"
      aria-label={open ? "Close menu" : "Open menu"}
    >
      {/* Three pixel bars that morph into X */}
      <span
        className={`absolute left-2.5 block h-[2px] w-4 bg-brand transition-all duration-200 ${
          open ? "top-[20px] rotate-45" : "top-[14px]"
        }`}
      />
      <span
        className={`absolute left-2.5 top-[20px] block h-[2px] w-4 bg-brand transition-opacity duration-200 ${
          open ? "opacity-0" : "opacity-100"
        }`}
      />
      <span
        className={`absolute left-2.5 block h-[2px] w-4 bg-brand transition-all duration-200 ${
          open ? "top-[20px] -rotate-45" : "top-[26px]"
        }`}
      />
    </button>
  );
}

export function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function handleLogout() {
    authClient.signOut().then(() => {
      router.push("/login");
    });
  }

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
      <nav className="hidden md:flex gap-1" aria-label="Dashboard navigation">
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
                border-2 border-brand
                transition-all
                ${
                  isActive
                    ? "bg-gold text-brand shadow-[2px_2px_0_var(--color-brand)]"
                    : "bg-transparent text-brand hover:bg-gold/20 shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[2px_2px_0_var(--color-brand)]"
                }
              `}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      {/* Desktop logout */}
      <button
        onClick={handleLogout}
        className="hidden md:block ml-auto font-[family-name:var(--font-press-start)] text-xs px-3 py-2 whitespace-nowrap border-2 border-brand bg-transparent text-brand hover:bg-red-100 shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[2px_2px_0_var(--color-brand)] transition-all"
      >
        Logout
      </button>

      {/* Hamburger button */}
      <div className="ml-auto md:hidden">
        <PixelHamburger open={open} onClick={() => setOpen(!open)} />
      </div>

      {/* Mobile slide-out overlay */}
      <div
        className={`fixed inset-0 z-[60] bg-brand/40 transition-opacity duration-200 md:hidden ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setOpen(false)}
      />

      {/* Mobile slide-out panel */}
      <div
        className={`fixed top-0 right-0 z-[70] h-full w-64 bg-surface border-l-2 border-brand shadow-[-6px_0_0_var(--color-brand)] transition-transform duration-250 ease-out md:hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between border-b-2 border-brand px-4 py-3">
          <span className="font-[family-name:var(--font-press-start)] text-[10px] text-brand/60 uppercase tracking-wider">
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
                  border-2 border-brand
                  transition-all
                  ${
                    isActive
                      ? "bg-gold text-brand shadow-[3px_3px_0_var(--color-brand)]"
                      : "bg-white text-brand shadow-[3px_3px_0_var(--color-brand)] hover:bg-gold/20"
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

        {/* Logout button */}
        <div className="px-4 mt-4">
          <button
            onClick={handleLogout}
            className="w-full font-[family-name:var(--font-press-start)] text-xs px-4 py-3 border-2 border-brand bg-white text-brand shadow-[3px_3px_0_var(--color-brand)] hover:bg-red-100 transition-all"
          >
            Logout
          </button>
        </div>

        {/* Decorative pixel art at bottom */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center">
          <span className="font-[family-name:var(--font-press-start)] text-[10px] text-brand/20 tracking-widest" aria-hidden="true">
            ........
          </span>
        </div>
      </div>
    </>
  );
}
