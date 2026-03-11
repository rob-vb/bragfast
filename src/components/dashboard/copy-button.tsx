"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded border border-[#4A3326]/20 px-1.5 py-0.5 text-[10px] text-[#4A3326]/50 hover:text-[#4A3326]/80 hover:border-[#4A3326]/40 transition-colors"
      title="Copy"
    >
      {copied ? (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-green-600">
            <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
          </svg>
          <span className="text-green-600">Copied!</span>
        </>
      ) : (
        <>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
            <path d="M5.5 3.5A1.5 1.5 0 0 1 7 2h5.5A1.5 1.5 0 0 1 14 3.5V11a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 11V3.5Z" />
            <path d="M3.5 5A1.5 1.5 0 0 0 2 6.5V13a1.5 1.5 0 0 0 1.5 1.5H9A1.5 1.5 0 0 0 10.5 13v-.5h-3A2.5 2.5 0 0 1 5 10V5h-.5Z" />
          </svg>
          <span>Copy</span>
        </>
      )}
    </button>
  );
}
