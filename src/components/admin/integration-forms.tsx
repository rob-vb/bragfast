"use client";

import { useState } from "react";
import { PixelButton } from "./pixel-button";

export type Provider = "stripe" | "posthog" | "ga4" | "buffer" | "postiz";

export const PROVIDER_LABELS: Record<Provider, string> = {
  stripe: "Stripe",
  posthog: "PostHog",
  ga4: "Google Analytics",
  buffer: "Buffer",
  postiz: "Postiz",
};

export const PROVIDER_DESCRIPTIONS: Record<Provider, string> = {
  stripe: "Track revenue milestones: MRR, total revenue, subscribers, and first sale.",
  posthog: "Track visitor milestones from PostHog analytics (30-day rolling window).",
  ga4: "Track visitor milestones from Google Analytics 4 (30-day rolling window).",
  buffer: "Push approved drafts to your Buffer queue or drafts.",
  postiz: "Push approved drafts to your Postiz instance (cloud or self-hosted).",
};

interface FormProps {
  onSubmit: (body: Record<string, string>) => void;
  submitting: boolean;
}

export function StripeForm({ onSubmit, submitting }: FormProps) {
  const [apiKey, setApiKey] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ apiKey });
      }}
      className="space-y-3"
    >
      <a
        href="https://dashboard.stripe.com/apikeys/create?name=brag.fast&permissions%5B%5D=rak_charge_read&permissions%5B%5D=rak_customer_read&permissions%5B%5D=rak_subscription_read&permissions%5B%5D=rak_invoice_read"
        target="_blank"
        rel="noreferrer"
        className="block border-2 border-brand bg-surface p-3 hover:bg-brand/5"
      >
        <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand font-medium">
          Click here to create a read-only API key →
        </p>
        <ol className="mt-2 space-y-1 font-[family-name:var(--font-geist-sans)] text-xs text-brand/70 list-decimal list-inside">
          <li>Scroll down, click &quot;Create key&quot;</li>
          <li>Don&apos;t change the permissions</li>
          <li>Don&apos;t delete the key or we can&apos;t refresh revenue</li>
        </ol>
      </a>
      <label className="block">
        <span className="font-[family-name:var(--font-geist-sans)] text-xs text-brand">
          Restricted key (rk_...)
        </span>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          required
          placeholder="rk_live_..."
          className="mt-1 w-full border-2 border-brand bg-white px-3 py-2 font-[family-name:var(--font-geist-mono)] text-sm"
        />
      </label>
      <PixelButton type="submit" disabled={submitting || !apiKey}>
        {submitting ? "Saving..." : "Connect"}
      </PixelButton>
    </form>
  );
}

export function PostHogForm({ onSubmit, submitting }: FormProps) {
  const [apiKey, setApiKey] = useState("");
  const [projectId, setProjectId] = useState("");
  const [host, setHost] = useState("https://us.posthog.com");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ apiKey, projectId, host });
      }}
      className="space-y-3"
    >
      <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/70">
        Create a personal API key in{" "}
        <a
          href="https://app.posthog.com/me/settings"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          PostHog Settings
        </a>{" "}
        with query + read access on your project.
      </p>
      <label className="block">
        <span className="font-[family-name:var(--font-geist-sans)] text-xs text-brand">
          Personal API key
        </span>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          required
          className="mt-1 w-full border-2 border-brand bg-white px-3 py-2 font-[family-name:var(--font-geist-mono)] text-sm"
        />
      </label>
      <label className="block">
        <span className="font-[family-name:var(--font-geist-sans)] text-xs text-brand">
          Project ID
        </span>
        <input
          type="text"
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          required
          placeholder="12345"
          className="mt-1 w-full border-2 border-brand bg-white px-3 py-2 font-[family-name:var(--font-geist-mono)] text-sm"
        />
      </label>
      <label className="block">
        <span className="font-[family-name:var(--font-geist-sans)] text-xs text-brand">
          Host
        </span>
        <select
          value={host}
          onChange={(e) => setHost(e.target.value)}
          className="mt-1 w-full border-2 border-brand bg-white px-3 py-2 font-[family-name:var(--font-geist-mono)] text-sm"
        >
          <option value="https://us.posthog.com">US Cloud</option>
          <option value="https://eu.posthog.com">EU Cloud</option>
        </select>
      </label>
      <PixelButton type="submit" disabled={submitting || !apiKey || !projectId}>
        {submitting ? "Saving..." : "Connect"}
      </PixelButton>
    </form>
  );
}

export function Ga4Form({ onSubmit, submitting }: FormProps) {
  const [serviceAccountJson, setServiceAccountJson] = useState("");
  const [propertyId, setPropertyId] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ serviceAccountJson, propertyId });
      }}
      className="space-y-3"
    >
      <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/70">
        Create a service account in{" "}
        <a
          href="https://console.cloud.google.com/iam-admin/serviceaccounts"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Google Cloud Console
        </a>{" "}
        with <code>Analytics Data API</code> read access. Add its email as a
        viewer on your GA4 property. Paste the downloaded JSON below.
      </p>
      <label className="block">
        <span className="font-[family-name:var(--font-geist-sans)] text-xs text-brand">
          Service-account JSON
        </span>
        <textarea
          value={serviceAccountJson}
          onChange={(e) => setServiceAccountJson(e.target.value)}
          required
          rows={6}
          placeholder={`{"type": "service_account", "client_email": "...", "private_key": "..."}`}
          className="mt-1 w-full border-2 border-brand bg-white px-3 py-2 font-[family-name:var(--font-geist-mono)] text-[11px]"
        />
      </label>
      <label className="block">
        <span className="font-[family-name:var(--font-geist-sans)] text-xs text-brand">
          GA4 Property ID
        </span>
        <input
          type="text"
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
          required
          placeholder="123456789"
          className="mt-1 w-full border-2 border-brand bg-white px-3 py-2 font-[family-name:var(--font-geist-mono)] text-sm"
        />
      </label>
      <PixelButton type="submit" disabled={submitting || !serviceAccountJson || !propertyId}>
        {submitting ? "Saving..." : "Connect"}
      </PixelButton>
    </form>
  );
}

interface ConnectDialogProps {
  provider: Provider;
  onClose: () => void;
  onDone: () => void;
}

export function ConnectDialog({ provider, onClose, onDone }: ConnectDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(body: Record<string, string>) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/sous-chef/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, ...body }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Failed: ${res.status}`);
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-brand/30 flex items-center justify-center p-4">
      <div className="bg-white border-2 border-brand shadow-[8px_8px_0_var(--color-brand)] p-6 max-w-lg w-full space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-[family-name:var(--font-press-start)] text-sm text-brand">
            Connect {PROVIDER_LABELS[provider]}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="font-[family-name:var(--font-press-start)] text-xs text-brand/60 hover:text-brand"
          >
            ✕
          </button>
        </div>

        {provider === "stripe" && <StripeForm onSubmit={handleSubmit} submitting={submitting} />}
        {provider === "posthog" && <PostHogForm onSubmit={handleSubmit} submitting={submitting} />}
        {provider === "ga4" && <Ga4Form onSubmit={handleSubmit} submitting={submitting} />}

        {error && (
          <p className="font-[family-name:var(--font-geist-mono)] text-xs text-red-600 break-words">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

interface InlineFormProps {
  provider: Provider;
  onDone: () => void;
}

/** Inline version for use inside the wizard accordion (no modal wrapper, no close button). */
export function InlineIntegrationForm({ provider, onDone }: InlineFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(body: Record<string, string>) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/sous-chef/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, ...body }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Failed: ${res.status}`);
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      {provider === "stripe" && <StripeForm onSubmit={handleSubmit} submitting={submitting} />}
      {provider === "posthog" && <PostHogForm onSubmit={handleSubmit} submitting={submitting} />}
      {provider === "ga4" && <Ga4Form onSubmit={handleSubmit} submitting={submitting} />}
      {error && (
        <p className="font-[family-name:var(--font-geist-mono)] text-xs text-red-600 break-words">
          {error}
        </p>
      )}
    </div>
  );
}
