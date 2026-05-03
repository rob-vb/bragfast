"use client";

import { useSyncExternalStore } from "react";
import { PixelCard } from "./pixel-card";
import { PixelButton } from "./pixel-button";

type Props = {
  appSlug: string;
};

const subscribe = () => () => {};

export function OrgPendingBanner({ appSlug }: Props) {
  const pending = useSyncExternalStore(
    subscribe,
    () =>
      new URLSearchParams(window.location.search).get("install_state") ===
      "pending",
    () => false,
  );
  if (!pending) return null;

  const installUrl = `https://github.com/apps/${appSlug}/installations/new`;

  return (
    <div data-testid="org-pending-banner">
      <PixelCard>
        <div className="space-y-3">
          <h2 className="font-[family-name:var(--font-press-start)] text-sm text-brand">
            GitHub install pending admin approval
          </h2>
          <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/80 max-w-prose">
            Your org requires an admin to approve the brag.fast GitHub App.
            We&apos;ve sent a request — they should see it in their GitHub
            settings. Until then, you can install on a personal repo to get
            started.
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={installUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="org-pending-personal-cta"
            >
              <PixelButton>Install on personal repo</PixelButton>
            </a>
            <a
              href={installUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="org-pending-resend-cta"
            >
              <PixelButton variant="ghost">Re-send admin request</PixelButton>
            </a>
          </div>
        </div>
      </PixelCard>
    </div>
  );
}
