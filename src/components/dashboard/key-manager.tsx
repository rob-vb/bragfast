"use client";

import { useState, useEffect } from "react";
import { PixelButton } from "@/components/dashboard/pixel-button";
import { PixelCard } from "@/components/dashboard/pixel-card";
import { PixelTable } from "@/components/dashboard/pixel-table";

type ApiKey = { id: string; name: string; prefix: string; created_at: string };

export function KeyManager() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    fetch("/api/v1/api-keys")
      .then((r) => r.json())
      .then(setKeys);
  }, []);

  async function handleCreate() {
    setLoading(true);
    const res = await fetch("/api/v1/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name || "default" }),
    });
    const data = await res.json();
    setNewKey(data.key);
    setName("");
    setShowCreate(false);
    setLoading(false);
    // Refresh list
    const updated = await fetch("/api/v1/api-keys").then((r) => r.json());
    setKeys(updated);
  }

  async function handleRevoke(id: string) {
    if (!confirm("Revoke this key? This cannot be undone.")) return;
    await fetch(`/api/v1/api-keys`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setKeys((prev) => prev.filter((k) => k.id !== id));
  }

  const inputClass =
    "w-full border-2 border-[#4A3326] bg-white px-3 py-2 text-sm text-[#4A3326] placeholder:text-[#4A3326]/40 focus:outline-none focus:ring-2 focus:ring-[#F8AF3C]";

  return (
    <div className="space-y-4">
      {/* New key alert */}
      {newKey && (
        <PixelCard className="border-[#F8AF3C] bg-[#F8AF3C]/10">
          <p className="font-[family-name:var(--font-press-start)] text-xs text-[#4A3326] mb-2">
            Save this key — you won&apos;t see it again!
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white border-2 border-[#4A3326] px-3 py-2 font-mono text-xs break-all">
              {newKey}
            </code>
            <PixelButton
              variant="ghost"
              onClick={() => {
                navigator.clipboard.writeText(newKey);
              }}
            >
              Copy
            </PixelButton>
          </div>
          <button
            onClick={() => setNewKey(null)}
            className="mt-2 text-xs text-[#4A3326]/60 hover:text-[#4A3326] underline"
          >
            Dismiss
          </button>
        </PixelCard>
      )}

      {/* Create form */}
      <div className="flex flex-wrap items-end gap-3">
        {showCreate ? (
          <>
            <input
              className={inputClass}
              placeholder="Key name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ maxWidth: 240 }}
            />
            <PixelButton onClick={handleCreate} disabled={loading}>
              {loading ? "..." : "Generate"}
            </PixelButton>
            <PixelButton variant="ghost" onClick={() => setShowCreate(false)}>
              Cancel
            </PixelButton>
          </>
        ) : (
          <PixelButton onClick={() => setShowCreate(true)}>
            + New Key
          </PixelButton>
        )}
      </div>

      {/* Key table */}
      {keys.length === 0 ? (
        <PixelCard>
          <p className="text-center text-sm text-[#4A3326]/60 py-8">
            No API keys yet.
          </p>
        </PixelCard>
      ) : (
        <PixelTable headers={["Name", "Key", "Created", ""]}>
          {keys.map((k) => (
            <tr key={k.id} className="hover:bg-[#F8AF3C]/5">
              <td className="px-4 py-3 text-xs">{k.name}</td>
              <td className="px-4 py-3 font-mono text-xs">{k.prefix}...</td>
              <td className="px-4 py-3 text-xs">
                {new Date(k.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <PixelButton variant="danger" onClick={() => handleRevoke(k.id)}>
                  Revoke
                </PixelButton>
              </td>
            </tr>
          ))}
        </PixelTable>
      )}
    </div>
  );
}
