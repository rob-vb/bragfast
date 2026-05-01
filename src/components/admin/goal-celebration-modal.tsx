"use client";

// S5.5: client-only celebration modal. Triggered by GoalHeroCard when a goal's
// firstHitAt transitions from null → string while the dashboard is open.
// Renders pure-CSS confetti — keeping the bundle slim and respecting the
// no-border-radius / hard-offset NES-retro look.

import { useEffect } from "react";
import Link from "next/link";

const SEEN_KEY_PREFIX = "goalCelebrationSeen:";

function markSeen(externalId: string) {
  try {
    sessionStorage.setItem(SEEN_KEY_PREFIX + externalId, "1");
  } catch {
    /* no sessionStorage in some embeds */
  }
}

export function hasSeenCelebration(externalId: string): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY_PREFIX + externalId) === "1";
  } catch {
    return false;
  }
}

interface Props {
  goalLabel: string;
  externalId: string;
  onClose: () => void;
}

export function GoalCelebrationModal({ goalLabel, externalId, onClose }: Props) {
  useEffect(() => {
    markSeen(externalId);
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [externalId, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand/40 backdrop-blur-sm"
      onClick={onClose}
      data-testid="goal-celebration-backdrop"
    >
      <Confetti />
      <div
        className="relative max-w-lg w-[92%] border-2 border-brand bg-gold p-8 shadow-[6px_6px_0_var(--color-brand)]"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-[family-name:var(--font-press-start)] text-[10px] text-brand/70 uppercase tracking-wider mb-3">
          &#9656; Goal hit
        </p>
        <h2 className="font-[family-name:var(--font-press-start)] text-lg md:text-xl text-brand mb-4 leading-relaxed">
          You hit {goalLabel}.
        </h2>
        <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/80 mb-6 leading-relaxed">
          brag.fast already drafted the post. Approve it from your drafts queue,
          then pick what ships next.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/admin/drafts"
            onClick={onClose}
            className="font-[family-name:var(--font-press-start)] text-[10px] px-4 py-3 border-2 border-brand bg-white text-brand text-center shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            Review draft
          </Link>
          <Link
            href="/admin/sous-chef"
            onClick={onClose}
            className="font-[family-name:var(--font-press-start)] text-[10px] px-4 py-3 border-2 border-brand bg-brand text-gold text-center shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            Set next goal
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/60 underline underline-offset-2 hover:text-brand"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// CSS-only confetti: 24 small squares animating down.
function Confetti() {
  const colors = ["#F2C94C", "#3E2723", "#FF6B6B", "#4ECDC4", "#A06CD5"];
  const pieces = Array.from({ length: 24 }, (_, i) => {
    const left = (i * 4.17) % 100;
    const delay = (i % 6) * 0.15;
    const duration = 2 + (i % 3) * 0.4;
    const color = colors[i % colors.length];
    return (
      <span
        key={i}
        className="absolute top-0 w-2 h-2 animate-confetti"
        style={{
          left: `${left}%`,
          animationDelay: `${delay}s`,
          animationDuration: `${duration}s`,
          backgroundColor: color,
        }}
      />
    );
  });
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
    >
      {pieces}
    </div>
  );
}
