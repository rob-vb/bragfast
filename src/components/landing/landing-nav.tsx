"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { authClient } from "@/lib/auth-client";

export function LandingNav() {
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    authClient.getSession().then((res) => {
      if (res.data?.user) setLoggedIn(true);
    });
  }, []);

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
      <header className="sticky top-0 z-50 border-b-2 border-brand bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 md:px-8">
          {/* Logo */}
          <Link href="/">
            <Image
              src="/logo.svg"
              alt="brag.fast"
              width={120}
              height={30}
              className="h-6 md:h-8 w-auto"
              priority
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-4">
            <Link
              href="/#features"
              className="font-[family-name:var(--font-press-start)] text-[10px] px-2 py-1 text-brand hover:text-gold transition-colors"
            >
              Features
            </Link>
            <Link
              href="/demo"
              className="font-[family-name:var(--font-press-start)] text-[10px] px-2 py-1 text-brand hover:text-gold transition-colors"
            >
              Demo
            </Link>
            <Link
              href="/docs"
              className="font-[family-name:var(--font-press-start)] text-[10px] px-2 py-1 text-brand hover:text-gold transition-colors"
            >
              Docs
            </Link>
            <Link
              href="/pricing"
              className="font-[family-name:var(--font-press-start)] text-[10px] px-2 py-1 text-brand hover:text-gold transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/support"
              className="font-[family-name:var(--font-press-start)] text-[10px] px-2 py-1 text-brand hover:text-gold transition-colors"
            >
              Support
            </Link>
            <Link
              href={loggedIn ? "/dashboard" : "/login"}
              className="font-[family-name:var(--font-press-start)] text-[10px] px-3 py-2 text-brand border-2 border-brand bg-gold shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[2px_2px_0_var(--color-brand)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
            >
              {loggedIn ? "Dashboard" : "Sign in"}
            </Link>
          </nav>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen(!open)}
            className="relative md:hidden h-8 w-8 border-2 border-brand bg-surface shadow-[2px_2px_0_var(--color-brand)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            <span
              className={`absolute left-1.5 block h-[2px] w-3 bg-brand transition-all duration-200 ${
                open ? "top-[13px] rotate-45" : "top-[8px]"
              }`}
            />
            <span
              className={`absolute left-1.5 top-[13px] block h-[2px] w-3 bg-brand transition-opacity duration-200 ${
                open ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute left-1.5 block h-[2px] w-3 bg-brand transition-all duration-200 ${
                open ? "top-[13px] -rotate-45" : "top-[18px]"
              }`}
            />
          </button>
        </div>
      </header>

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-[60] bg-brand/40 transition-opacity duration-200 md:hidden ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setOpen(false)}
      />

      {/* Mobile panel */}
      <div
        className={`fixed top-0 right-0 z-[70] h-full w-64 bg-surface border-l-2 border-brand shadow-[-6px_0_0_var(--color-brand)] transition-transform duration-250 ease-out md:hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-end border-b-2 border-brand px-4 py-3">
          <button
            onClick={() => setOpen(false)}
            className="relative h-8 w-8 border-2 border-brand bg-surface shadow-[2px_2px_0_var(--color-brand)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
            aria-label="Close menu"
          >
            <span className="absolute left-1.5 top-[13px] block h-[2px] w-3 bg-brand rotate-45" />
            <span className="absolute left-1.5 top-[13px] block h-[2px] w-3 bg-brand -rotate-45" />
          </button>
        </div>
        <nav className="flex flex-col gap-2 p-4">
          <Link
            href="/#features"
            onClick={() => setOpen(false)}
            className="font-[family-name:var(--font-press-start)] text-xs px-4 py-3 text-brand border-2 border-brand bg-white shadow-[3px_3px_0_var(--color-brand)] hover:bg-gold/20 transition-all"
          >
            Features
          </Link>
          <Link
            href="/demo"
            onClick={() => setOpen(false)}
            className="font-[family-name:var(--font-press-start)] text-xs px-4 py-3 text-brand border-2 border-brand bg-white shadow-[3px_3px_0_var(--color-brand)] hover:bg-gold/20 transition-all"
          >
            Demo
          </Link>
          <Link
            href="/docs"
            onClick={() => setOpen(false)}
            className="font-[family-name:var(--font-press-start)] text-xs px-4 py-3 text-brand border-2 border-brand bg-white shadow-[3px_3px_0_var(--color-brand)] hover:bg-gold/20 transition-all"
          >
            Docs
          </Link>
          <Link
            href="/pricing"
            onClick={() => setOpen(false)}
            className="font-[family-name:var(--font-press-start)] text-xs px-4 py-3 text-brand border-2 border-brand bg-white shadow-[3px_3px_0_var(--color-brand)] hover:bg-gold/20 transition-all"
          >
            Pricing
          </Link>
          <Link
            href="/support"
            onClick={() => setOpen(false)}
            className="font-[family-name:var(--font-press-start)] text-xs px-4 py-3 text-brand border-2 border-brand bg-white shadow-[3px_3px_0_var(--color-brand)] hover:bg-gold/20 transition-all"
          >
            Support
          </Link>
          <Link
            href={loggedIn ? "/dashboard" : "/login"}
            onClick={() => setOpen(false)}
            className="font-[family-name:var(--font-press-start)] text-xs px-4 py-3 text-brand border-2 border-brand bg-gold shadow-[3px_3px_0_var(--color-brand)] transition-all"
          >
            {loggedIn ? "Dashboard" : "Sign in"}
          </Link>
        </nav>
      </div>
    </>
  );
}
