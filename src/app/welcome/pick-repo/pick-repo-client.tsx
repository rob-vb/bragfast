"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Repo = {
  full_name: string;
  name: string;
  private: boolean;
  description: string | null;
};

type Installation = {
  installationId: number;
  status: "active" | "suspended" | "removed";
};

const POST_PICK_PATH = "/admin";

export function PickRepoClient() {
  const router = useRouter();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [installationId, setInstallationId] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [instRes, reposRes] = await Promise.all([
          fetch("/api/github/installations"),
          fetch("/api/github/repos"),
        ]);
        if (!instRes.ok) throw new Error("Failed to load installation");
        if (!reposRes.ok) throw new Error("Failed to load repos");
        const insts: Installation[] = await instRes.json();
        const reposData = await reposRes.json();
        if (cancelled) return;
        const active = insts.find((i) => i.status === "active");
        if (!active) {
          setError("No active GitHub install found. Install the app first.");
          setLoading(false);
          return;
        }
        setInstallationId(active.installationId);
        setRepos(reposData.repos ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onConfirm() {
    if (!installationId || !selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/github/configs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          installationId,
          repoFullName: selected,
          enabled: true,
          notifyOnPrMerge: true,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save selection");
      }
      router.push(POST_PICK_PATH);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-brand/60">Loading repos…</p>;
  }

  if (error && repos.length === 0) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (repos.length === 0) {
    return (
      <p className="text-sm text-brand/70">
        No repos available on this installation. Adjust your install scope on GitHub and refresh.
      </p>
    );
  }

  const sorted = [...repos].sort((a, b) =>
    a.full_name.localeCompare(b.full_name),
  );

  return (
    <div className="space-y-4">
      <ul className="max-h-80 overflow-y-auto border-2 border-brand divide-y-2 divide-brand">
        {sorted.map((repo) => (
          <li key={repo.full_name}>
            <label className="flex items-start gap-3 px-3 py-3 cursor-pointer hover:bg-gold/30">
              <input
                type="radio"
                name="repo"
                value={repo.full_name}
                checked={selected === repo.full_name}
                onChange={() => setSelected(repo.full_name)}
                className="mt-1 accent-brand"
              />
              <div className="flex-1 min-w-0">
                <div className="font-mono text-sm font-bold text-brand truncate">
                  {repo.full_name}
                  {repo.private && (
                    <span className="ml-2 text-[10px] uppercase tracking-widest text-brand/60">
                      private
                    </span>
                  )}
                </div>
                {repo.description && (
                  <div className="text-xs text-brand/60 truncate mt-0.5">
                    {repo.description}
                  </div>
                )}
              </div>
            </label>
          </li>
        ))}
      </ul>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={onConfirm}
        disabled={!selected || submitting}
        className="w-full bg-gold text-brand border-2 border-brand px-4 py-3 font-mono text-xs uppercase tracking-widest font-bold shadow-[3px_3px_0_var(--color-brand)] transition-all hover:shadow-[2px_2px_0_var(--color-brand)] hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Saving…" : "▸ Watch this repo"}
      </button>
    </div>
  );
}
