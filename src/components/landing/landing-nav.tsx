"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

export function LandingNav() {
  const [open, setOpen] = useState(false);

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
      <header className="sticky top-0 z-50 border-b-2 border-[#4A3326] bg-[#FFF8F0]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-8">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-[family-name:var(--font-press-start)] text-sm md:text-base text-[#4A3326]"
          >
            <Image
              src="/logo-icon.svg"
              alt="Bragfast logo"
              width={32}
              height={32}
              className="w-6 h-6 md:w-8 md:h-8"
            />
            <span className="text-[#F8AF3C]">brag</span>.fast
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-2">
            <Link
              href="/coming-soon"
              className="font-[family-name:var(--font-press-start)] text-[10px] px-3 py-2 text-[#4A3326] border-2 border-[#4A3326] bg-transparent shadow-[3px_3px_0_#4A3326] hover:bg-[#F8AF3C]/20 hover:shadow-[2px_2px_0_#4A3326] transition-all"
            >
              Docs
            </Link>
            <Link
              href="/coming-soon"
              className="font-[family-name:var(--font-press-start)] text-[10px] px-3 py-2 text-[#4A3326] border-2 border-[#4A3326] bg-transparent shadow-[3px_3px_0_#4A3326] hover:bg-[#F8AF3C]/20 hover:shadow-[2px_2px_0_#4A3326] transition-all"
            >
              Demo
            </Link>
            <Link
              href="/signup"
              className="font-[family-name:var(--font-press-start)] text-[10px] px-3 py-2 text-[#4A3326] border-2 border-[#4A3326] bg-[#F8AF3C] shadow-[3px_3px_0_#4A3326] hover:shadow-[2px_2px_0_#4A3326] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
            >
              Get 30 Free Credits
            </Link>
          </nav>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen(!open)}
            className="relative md:hidden h-8 w-8 border-2 border-[#4A3326] bg-[#FFF8F0] shadow-[2px_2px_0_#4A3326] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
            aria-label={open ? "Close menu" : "Open menu"}
          >
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
        </div>
      </header>

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-[60] bg-[#4A3326]/40 transition-opacity duration-200 md:hidden ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setOpen(false)}
      />

      {/* Mobile panel */}
      <div
        className={`fixed top-0 right-0 z-[70] h-full w-64 bg-[#FFF8F0] border-l-2 border-[#4A3326] shadow-[-6px_0_0_#4A3326] transition-transform duration-250 ease-out md:hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-end border-b-2 border-[#4A3326] px-4 py-3">
          <button
            onClick={() => setOpen(false)}
            className="relative h-8 w-8 border-2 border-[#4A3326] bg-[#FFF8F0] shadow-[2px_2px_0_#4A3326] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
            aria-label="Close menu"
          >
            <span className="absolute left-1.5 top-[13px] block h-[2px] w-3 bg-[#4A3326] rotate-45" />
            <span className="absolute left-1.5 top-[13px] block h-[2px] w-3 bg-[#4A3326] -rotate-45" />
          </button>
        </div>
        <nav className="flex flex-col gap-2 p-4">
          <Link
            href="/coming-soon"
            onClick={() => setOpen(false)}
            className="font-[family-name:var(--font-press-start)] text-xs px-4 py-3 text-[#4A3326] border-2 border-[#4A3326] bg-white shadow-[3px_3px_0_#4A3326] hover:bg-[#F8AF3C]/20 transition-all"
          >
            Docs
          </Link>
          <Link
            href="/coming-soon"
            onClick={() => setOpen(false)}
            className="font-[family-name:var(--font-press-start)] text-xs px-4 py-3 text-[#4A3326] border-2 border-[#4A3326] bg-white shadow-[3px_3px_0_#4A3326] hover:bg-[#F8AF3C]/20 transition-all"
          >
            Demo
          </Link>
          <Link
            href="/signup"
            onClick={() => setOpen(false)}
            className="font-[family-name:var(--font-press-start)] text-xs px-4 py-3 text-[#4A3326] border-2 border-[#4A3326] bg-[#F8AF3C] shadow-[3px_3px_0_#4A3326] transition-all"
          >
            Get 30 Free Credits
          </Link>
        </nav>
      </div>
    </>
  );
}
