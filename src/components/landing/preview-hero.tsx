"use client";

import { useState } from "react";
import Link from "next/link";
import posthog from "posthog-js";

type PreviewState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; code: string; message: string }
  | { kind: "ready"; imageUrl: string; prNumber: number; prTitle: string; prUrl: string; repo: string };

const RETURNING_KEY = "bf_pv_seen";

function repoHostOf(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.toLowerCase();
  } catch {
    return "unknown";
  }
}

function isReturningVisitor(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(RETURNING_KEY) === "1";
  } catch {
    return false;
  }
}

function markVisitor(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(RETURNING_KEY, "1");
  } catch {
    /* ignore */
  }
}

const ERROR_COPY: Record<string, string> = {
  invalid_repo_url: "That doesn't look like a GitHub repo URL.",
  missing_repo_url: "Paste a GitHub repo URL first.",
  repo_not_found: "Couldn't find that repo on GitHub.",
  no_merged_pr: "That repo has no merged pull requests yet.",
  opted_out: "This repo opted out of brag.fast previews.",
  sensitive_content:
    "Latest PR looks sensitive (security/private). We don't render those.",
  rate_limited: "Too many previews. Try again in a minute.",
  github_rate_limited: "GitHub's rate-limiting us. Try again in an hour.",
  render_failed: "Render failed. Try again.",
  network_error: "Couldn't reach the server. Try again.",
};

export function PreviewHero() {
  const [url, setUrl] = useState("");
  const [state, setState] = useState<PreviewState>({ kind: "idle" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state.kind === "loading") return;
    const trimmed = url.trim();
    if (!trimmed) return;

    const host = repoHostOf(trimmed);
    posthog.capture("preview_repo_pasted", {
      repo_host: host,
      is_returning_visitor: isReturningVisitor(),
    });
    markVisitor();
    posthog.capture("preview_render_started", { repo_host: host });

    setState({ kind: "loading" });
    const startedAt = Date.now();

    let res: Response;
    try {
      res = await fetch("/api/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ repoUrl: trimmed }),
      });
    } catch {
      const elapsed = Date.now() - startedAt;
      posthog.capture("preview_render_completed", {
        render_duration_ms: elapsed,
        was_successful: false,
        failure_reason: "network_error",
      });
      setState({ kind: "error", code: "network_error", message: ERROR_COPY.network_error });
      return;
    }

    const elapsed = Date.now() - startedAt;
    let body: { error?: string; image?: { url: string }; pr?: { number: number; title: string; url: string }; repo?: string };
    try {
      body = await res.json();
    } catch {
      posthog.capture("preview_render_completed", {
        render_duration_ms: elapsed,
        was_successful: false,
        failure_reason: "bad_response",
      });
      setState({ kind: "error", code: "render_failed", message: ERROR_COPY.render_failed });
      return;
    }

    if (!res.ok) {
      const code = body.error ?? "render_failed";
      posthog.capture("preview_render_completed", {
        render_duration_ms: elapsed,
        was_successful: false,
        failure_reason: code,
      });
      setState({ kind: "error", code, message: ERROR_COPY[code] ?? ERROR_COPY.render_failed });
      return;
    }

    if (!body.image || !body.pr || !body.repo) {
      posthog.capture("preview_render_completed", {
        render_duration_ms: elapsed,
        was_successful: false,
        failure_reason: "bad_response",
      });
      setState({ kind: "error", code: "render_failed", message: ERROR_COPY.render_failed });
      return;
    }

    posthog.capture("preview_render_completed", {
      render_duration_ms: elapsed,
      was_successful: true,
    });
    setState({
      kind: "ready",
      imageUrl: body.image.url,
      prNumber: body.pr.number,
      prTitle: body.pr.title,
      prUrl: body.pr.url,
      repo: body.repo,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-[family-name:var(--font-press-start)] text-2xl md:text-4xl leading-[1.4]">
        See your last PR as a brag post
      </h1>
      <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/80 max-w-xl leading-relaxed">
        Paste any public GitHub repo. We render its latest merged PR as a watermarked sample. Sign up to keep going.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/owner/repo"
          aria-label="GitHub repo URL"
          className="flex-1 font-[family-name:var(--font-geist-sans)] text-base px-4 py-4 bg-white text-brand border-2 border-brand shadow-[3px_3px_0_var(--color-brand)] focus:outline-none focus:shadow-[1px_1px_0_var(--color-brand)] focus:translate-x-[2px] focus:translate-y-[2px] transition-all"
        />
        <button
          type="submit"
          disabled={state.kind === "loading" || url.trim() === ""}
          className="font-[family-name:var(--font-press-start)] text-xs md:text-sm px-6 py-4 text-brand border-2 border-brand bg-gold shadow-[4px_4px_0_var(--color-brand)] hover:shadow-[2px_2px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {state.kind === "loading" ? "Cooking…" : "Preview"}
        </button>
      </form>

      {state.kind === "error" ? (
        <div
          role="alert"
          className="font-[family-name:var(--font-geist-sans)] text-sm border-2 border-brand bg-white px-4 py-3"
          data-error-code={state.code}
        >
          {state.message}
        </div>
      ) : null}

      {state.kind === "ready" ? (
        <div
          className="border-2 border-brand bg-white shadow-[4px_4px_0_var(--color-brand)] flex flex-col gap-3 p-3"
          data-preview-ready="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={state.imageUrl}
            alt={`Preview render for ${state.repo} PR #${state.prNumber}`}
            width={540}
            height={540}
            className="w-full h-auto border-2 border-brand"
          />
          <div className="flex flex-col gap-2 px-1 pb-1">
            <div className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/60">
              {state.repo} · PR #{state.prNumber}
            </div>
            <Link
              href={`/signup?source=preview`}
              className="self-start font-[family-name:var(--font-press-start)] text-[10px] px-4 py-3 mt-1 text-brand border-2 border-brand bg-gold shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              Get unwatermarked posts →
            </Link>
          </div>
        </div>
      ) : null}

      {state.kind === "idle" ? (
        <p className="font-[family-name:var(--font-geist-sans)] text-md text-brand/50">
          No signup needed for the preview.
        </p>
      ) : null}
    </div>
  );
}
