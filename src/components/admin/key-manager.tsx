"use client";

import { useState, useEffect } from "react";
import { PixelButton } from "@/components/admin/pixel-button";
import { PixelCard } from "@/components/admin/pixel-card";
import { PixelTable } from "@/components/admin/pixel-table";
import { CopyButton } from "@/components/admin/copy-button";
import { Input } from "@/components/ui/input";

type ApiKey = { id: string; name: string; key: string | null; prefix: string; created_at: string };

export function KeyManager() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
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
    await fetch("/api/v1/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name || "default" }),
    });
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

  return (
    <div className="space-y-4">
      {/* Create form */}
      <div className="flex flex-wrap items-end gap-3">
        {showCreate ? (
          <>
            <Input
              className="max-w-60"
              placeholder="Key name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
          <p className="text-center text-sm text-brand/60 py-8">
            No API keys yet.
          </p>
        </PixelCard>
      ) : (
        <PixelTable headers={["Name", "Key", "Created", ""]}>
          {keys.map((k) => (
            <tr key={k.id} className="hover:bg-gold/5">
              <td className="px-4 py-3 text-xs">{k.name}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <code className="font-mono text-xs break-all">
                    {k.key ?? `${k.prefix}...`}
                  </code>
                  {k.key && <CopyButton text={k.key} />}
                </div>
              </td>
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
