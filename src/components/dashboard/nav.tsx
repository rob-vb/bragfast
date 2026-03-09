"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Kitchen", href: "/dashboard" },
  { label: "Brands", href: "/dashboard/brands" },
  { label: "History", href: "/dashboard/history" },
  { label: "Keys", href: "/dashboard/keys" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto">
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
              font-[family-name:var(--font-press-start)] text-[10px] sm:text-xs px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap
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
  );
}
