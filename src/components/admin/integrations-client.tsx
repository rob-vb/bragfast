"use client";

import { useEffect, useState } from "react";
import { PixelCard } from "@/components/admin/pixel-card";
import { PixelButton } from "@/components/admin/pixel-button";
import { ConnectDialog } from "@/components/admin/integration-forms";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type IntegrationRow = {
  provider: string;
  enabled: boolean;
  extra?: string | null;
};

type ChannelInfo = {
  id: string;
  name: string;
  service?: string;
};

function parseChannels(extra: string | null | undefined): ChannelInfo[] {
  if (!extra) return [];
  try {
    const parsed = JSON.parse(extra) as { channels?: ChannelInfo[] };
    return parsed.channels ?? [];
  } catch {
    return [];
  }
}

export function IntegrationsClient() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [bufferRow, setBufferRow] = useState<IntegrationRow | null>(null);
  const [showConnect, setShowConnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/v1/sous-chef/integrations");
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = (await res.json()) as { integrations: IntegrationRow[] };
      const row = data.integrations.find(
        (r) => r.provider === "buffer" && r.enabled,
      );
      setBufferRow(row ?? null);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function disconnect() {
    setDisconnecting(true);
    try {
      const res = await fetch(
        "/api/v1/sous-chef/integrations?provider=buffer",
        { method: "DELETE" },
      );
      if (res.ok) {
        await load();
      }
    } finally {
      setDisconnecting(false);
    }
  }

  if (loading) {
    return (
      <PixelCard>
        <div className="h-24 animate-pulse bg-brand/5" />
      </PixelCard>
    );
  }

  if (error) {
    return (
      <PixelCard>
        <p className="font-[family-name:var(--font-geist-mono)] text-xs text-brand/60">
          Something went wrong. Try again or reload the page.
        </p>
      </PixelCard>
    );
  }

  const connected = bufferRow !== null;
  const channels = parseChannels(bufferRow?.extra);

  return (
    <>
      <PixelCard>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="font-[family-name:var(--font-press-start)] text-sm text-brand">
                Buffer
              </h2>
              <span
                className={`font-[family-name:var(--font-press-start)] text-[10px] px-2 py-1 border-2 border-brand uppercase tracking-wider ${
                  connected
                    ? "bg-gold text-brand"
                    : "bg-surface text-brand/60"
                }`}
              >
                {connected ? "Connected" : "Off"}
              </span>
            </div>

            <div className="flex gap-2">
              {!connected ? (
                <PixelButton onClick={() => setShowConnect(true)}>
                  Connect Buffer
                </PixelButton>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <PixelButton variant="danger" disabled={disconnecting}>
                      {disconnecting ? "Disconnecting..." : "Disconnect"}
                    </PixelButton>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disconnect Buffer?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Scheduled posts already sent won&apos;t be affected.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel asChild>
                        <PixelButton variant="ghost">Stay Connected</PixelButton>
                      </AlertDialogCancel>
                      <AlertDialogAction asChild>
                        <PixelButton variant="danger" onClick={disconnect}>
                          Disconnect
                        </PixelButton>
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>

          <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/70">
            Connect your Buffer account to schedule posts directly from the
            Workspace.
          </p>

          {connected && channels.length > 0 && (
            <ul className="space-y-1">
              {channels.map((ch) => (
                <li
                  key={ch.id}
                  className="font-[family-name:var(--font-geist-mono)] text-xs text-brand/70 flex gap-2"
                >
                  <span className="text-brand/40">{ch.service ?? "channel"}</span>
                  <span>{ch.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PixelCard>

      {showConnect && (
        <ConnectDialog
          provider="buffer"
          onClose={() => setShowConnect(false)}
          onDone={() => {
            setShowConnect(false);
            load();
          }}
        />
      )}
    </>
  );
}
