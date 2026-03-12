"use client";

import { useState } from "react";
import { createPortalSession } from "./billing-actions";

export function ManageBillingButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const url = await createPortalSession();
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
      className="font-[family-name:var(--font-press-start)] text-[10px] px-3 py-2 border-2 border-brand bg-white text-brand shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-wait"
    >
      {loading ? "Loading..." : "Manage Billing"}
    </button>
  );
}
