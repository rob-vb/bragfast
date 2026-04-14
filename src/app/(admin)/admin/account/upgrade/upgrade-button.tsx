"use client";

import { useState } from "react";
import { createCheckout } from "./actions";

export function UpgradeButton({ planId }: { planId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const url = await createCheckout(planId);
      if (url) {
        window.location.href = url;
      }
    } catch {
      setLoading(false);
      alert("Something went wrong. Please try again.");
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="block w-full text-center font-[family-name:var(--font-press-start)] text-[10px] px-4 py-3 border-2 border-brand bg-brand text-[var(--color-surface)] shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-wait"
    >
      {loading ? "Redirecting..." : "Subscribe"}
    </button>
  );
}
