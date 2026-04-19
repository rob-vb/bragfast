"use client";

import { useState, useTransition } from "react";
import { PixelButton } from "@/components/admin/pixel-button";
import { PixelCard } from "@/components/admin/pixel-card";
import { PixelBadge } from "@/components/admin/pixel-badge";
import { useRouter } from "next/navigation";

type DraftStatus = "pending_review" | "approved" | "dismissed" | "expired" | "error";

type DraftView = {
  id: string;
  copy: string;
  originalCopy: string;
  status: DraftStatus;
  source: string;
  repoFullName?: string;
  sourceCommitShas?: string[];
  suggestedTemplateId: string;
  suggestedFormat: "landscape" | "square" | "portrait";
  errorMessage?: string;
  postedAt?: number;
  created_at: string;
  approved_at?: string;
};

type Filter = "pending_review" | "approved" | "all";

export function DraftsList({ initialDrafts }: { initialDrafts: DraftView[] }) {
  const [drafts, setDrafts] = useState(initialDrafts);
  const [filter, setFilter] = useState<Filter>("pending_review");
  const router = useRouter();

  const counts = {
    pending: drafts.filter((d) => d.status === "pending_review").length,
    approved: drafts.filter((d) => d.status === "approved").length,
  };

  const visible = drafts.filter((d) => (filter === "all" ? true : d.status === filter));

  function updateDraftLocal(id: string, patch: Partial<DraftView>) {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  if (drafts.length === 0) {
    return (
      <PixelCard>
        <div className="p-8 text-center space-y-3">
          <div className="text-4xl" aria-hidden>☕</div>
          <p className="font-[family-name:var(--font-press-start)] text-xs text-brand">
            Nothing brag-worthy yet.
          </p>
          <p className="text-brand/70 text-sm">Keep shipping.</p>
        </div>
      </PixelCard>
    );
  }

  return (
    <div className="space-y-4">
      <nav className="flex gap-2 items-center" aria-label="Filter drafts">
        <FilterPill active={filter === "pending_review"} onClick={() => setFilter("pending_review")}>
          Pending ({counts.pending})
        </FilterPill>
        <FilterPill active={filter === "approved"} onClick={() => setFilter("approved")}>
          Approved ({counts.approved})
        </FilterPill>
        <FilterPill active={filter === "all"} onClick={() => setFilter("all")}>
          All
        </FilterPill>
        <button
          onClick={() => router.refresh()}
          className="ml-auto text-xs text-brand/70 hover:text-brand underline"
        >
          Refresh
        </button>
      </nav>

      <ul role="list" className="space-y-4">
        {visible.map((d) => (
          <li key={d.id} role="listitem">
            <DraftCard draft={d} onLocalUpdate={(patch) => updateDraftLocal(d.id, patch)} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`font-[family-name:var(--font-press-start)] text-[10px] px-3 py-2 border-2 border-brand ${
        active ? "bg-gold text-brand shadow-[2px_2px_0_var(--color-brand)]" : "bg-white text-brand"
      }`}
    >
      {children}
    </button>
  );
}

function DraftCard({
  draft,
  onLocalUpdate,
}: {
  draft: DraftView;
  onLocalUpdate: (patch: Partial<DraftView>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [copy, setCopy] = useState(draft.copy);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const shortSha = draft.sourceCommitShas?.[0]?.slice(0, 7);

  async function callRoute(path: string, body?: unknown) {
    setError(null);
    const res = await fetch(path, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return res.json();
  }

  function onApprove() {
    startTransition(async () => {
      try {
        await callRoute(`/api/v1/drafts/${draft.id}/approve`, { editedCopy: copy });
        onLocalUpdate({ status: "approved", copy });
        setEditing(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Approve failed");
      }
    });
  }

  function onDismiss() {
    startTransition(async () => {
      try {
        await callRoute(`/api/v1/drafts/${draft.id}/dismiss`);
        onLocalUpdate({ status: "dismissed" });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Dismiss failed");
      }
    });
  }

  function onTogglePosted(posted: boolean) {
    startTransition(async () => {
      try {
        await callRoute(`/api/v1/drafts/${draft.id}/posted`, { posted });
        onLocalUpdate({ postedAt: posted ? Date.now() : undefined });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Update failed");
      }
    });
  }

  function onCopyTweet() {
    navigator.clipboard.writeText(copy).then(() => {
      const live = document.getElementById("a11y-live");
      if (live) live.textContent = "Copied to clipboard";
    });
  }

  function onMakeVideo() {
    startTransition(async () => {
      try {
        await callRoute(`/api/v1/drafts/${draft.id}/video`);
        const live = document.getElementById("a11y-live");
        if (live) live.textContent = "Video render started";
      } catch (err) {
        setError(err instanceof Error ? err.message : "Video failed");
      }
    });
  }

  if (draft.status === "error") {
    return (
      <PixelCard className="border-destructive/60">
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-2">
            <PixelBadge label="ERROR" variant="failed" />
            <span className="text-xs text-brand/60 font-mono">{draft.created_at.slice(0, 16)}</span>
          </div>
          <p className="text-sm text-destructive break-words">{draft.errorMessage || "Unknown error"}</p>
        </div>
      </PixelCard>
    );
  }

  return (
    <PixelCard>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <PixelBadge label={draft.status.replace("_", " ").toUpperCase()} variant={badgeVariantFor(draft.status)} />
          <span className="text-[10px] text-brand/60 font-[family-name:var(--font-press-start)]">
            ▸ {draft.source === "cron-commit" ? "Haiku on commit" : draft.source} {shortSha ?? ""}
          </span>
          {draft.repoFullName && (
            <span className="text-xs text-brand/60 font-mono">{draft.repoFullName}</span>
          )}
          <span className="ml-auto text-xs text-brand/60 font-mono">{draft.created_at.slice(0, 16)}</span>
        </div>

        {editing ? (
          <textarea
            value={copy}
            onChange={(e) => setCopy(e.target.value)}
            maxLength={280}
            rows={3}
            className="w-full border-2 border-brand p-2 text-sm bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          />
        ) : (
          <p className="text-brand text-sm whitespace-pre-wrap break-words">{copy}</p>
        )}
        {editing && (
          <div className="flex items-center justify-between text-xs text-brand/60">
            <span>{copy.length}/280</span>
            <button
              onClick={() => setCopy(draft.originalCopy)}
              className="underline hover:text-brand"
              disabled={copy === draft.originalCopy}
            >
              Revert to original
            </button>
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex flex-wrap items-center gap-2 pt-2">
          {draft.status === "pending_review" && (
            <>
              <PixelButton onClick={onApprove} disabled={pending} variant="primary">
                {pending ? "..." : "Approve"}
              </PixelButton>
              <PixelButton onClick={() => setEditing((v) => !v)} disabled={pending} variant="ghost">
                {editing ? "Done" : "Edit copy"}
              </PixelButton>
              <button
                onClick={onDismiss}
                disabled={pending}
                className="text-xs text-brand/70 hover:text-brand underline"
              >
                Dismiss
              </button>
            </>
          )}
          {draft.status === "approved" && (
            <>
              <PixelButton onClick={onCopyTweet} variant="primary">
                Copy tweet
              </PixelButton>
              <PixelButton onClick={onMakeVideo} disabled={pending} variant="ghost">
                Make video →
              </PixelButton>
              <span className="text-xs text-brand/70 mx-2">Posted?</span>
              <PostedToggle posted={Boolean(draft.postedAt)} onChange={onTogglePosted} disabled={pending} />
            </>
          )}
        </div>
      </div>
    </PixelCard>
  );
}

function PostedToggle({
  posted,
  onChange,
  disabled,
}: {
  posted: boolean;
  onChange: (posted: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Did you post this?" className="flex gap-1">
      <button
        role="radio"
        aria-checked={posted}
        disabled={disabled}
        onClick={() => onChange(true)}
        className={`font-[family-name:var(--font-press-start)] text-[10px] px-2 py-1 border-2 border-brand ${
          posted ? "bg-gold text-brand" : "bg-white text-brand/70"
        }`}
      >
        yes
      </button>
      <button
        role="radio"
        aria-checked={!posted}
        disabled={disabled}
        onClick={() => onChange(false)}
        className={`font-[family-name:var(--font-press-start)] text-[10px] px-2 py-1 border-2 border-brand ${
          !posted ? "bg-gold text-brand" : "bg-white text-brand/70"
        }`}
      >
        not yet
      </button>
    </div>
  );
}

function badgeVariantFor(status: DraftStatus): "pending_review" | "completed" | "failed" | "dismissed" | "pending" {
  if (status === "pending_review") return "pending_review";
  if (status === "approved") return "completed";
  if (status === "error") return "failed";
  if (status === "dismissed") return "dismissed";
  return "pending";
}
