"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

const MCP_URL = "https://mcp.brag.fast/mcp";

function CopyButton({ text, onDark = false }: { text: string; onDark?: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`p-1.5 transition-colors ${onDark ? "text-surface/50 hover:text-gold" : "text-brand/40 hover:text-brand/80"}`}
      aria-label="Copy to clipboard"
    >
      {copied ? <Check size={14} className={onDark ? "text-gold" : ""} /> : <Copy size={14} />}
    </button>
  );
}

type Tab = "claude" | "claude-code";

export function McpInstallInstructions() {
  const [activeTab, setActiveTab] = useState<Tab>("claude");

  return (
    <div className="border-2 border-brand shadow-[4px_4px_0_var(--color-brand)] bg-surface min-w-0">
      {/* Tabs */}
      <div className="flex border-b-2 border-brand">
        {(
          [
            { id: "claude", label: "Claude" },
            { id: "claude-code", label: "Claude Code" },
          ] as { id: Tab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 font-[family-name:var(--font-press-start)] text-[8px] uppercase tracking-wider transition-colors border-r-2 border-brand last:border-r-0 ${
              activeTab === tab.id
                ? "bg-brand text-gold"
                : "bg-surface text-brand/50 hover:text-brand/80"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Claude instructions */}
      {activeTab === "claude" && (
        <div className="p-5 flex flex-col gap-4">
          <p className="font-[family-name:var(--font-press-start)] text-[8px] text-brand/50 uppercase tracking-wider">
            Claude Instructions
          </p>
          <ol className="flex flex-col gap-4">
            <li className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 bg-brand text-gold font-[family-name:var(--font-press-start)] text-[8px] flex items-center justify-center border border-brand">
                1
              </span>
              <span className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/80 leading-snug pt-0.5">
                Open{" "}
                <a
                  href="https://claude.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline underline-offset-2"
                >
                  Claude
                </a>{" "}
                or{" "}
                <a
                  href="https://claude.ai/cowork"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline underline-offset-2"
                >
                  Claude Cowork
                </a>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 bg-brand text-gold font-[family-name:var(--font-press-start)] text-[8px] flex items-center justify-center border border-brand">
                2
              </span>
              <span className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/80 leading-snug pt-0.5">
                Go to{" "}
                <strong>Settings → Connectors → Add Custom Connector</strong>
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 bg-brand text-gold font-[family-name:var(--font-press-start)] text-[8px] flex items-center justify-center border border-brand">
                3
              </span>
              <div className="flex-1 min-w-0 pt-0.5">
                <span className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/80 block mb-2">
                  Paste this URL:
                </span>
                <div className="flex items-center justify-between gap-2 border-2 border-brand bg-white px-3 py-2">
                  <code className="font-[family-name:var(--font-geist-mono)] text-xs text-brand break-all">
                    {MCP_URL}
                  </code>
                  <CopyButton text={MCP_URL} />
                </div>
              </div>
            </li>
          </ol>
        </div>
      )}

      {/* Claude Code instructions */}
      {activeTab === "claude-code" && (
        <div className="p-5 flex flex-col gap-3">
          <p className="font-[family-name:var(--font-press-start)] text-[8px] text-brand/50 uppercase tracking-wider">
            Claude Code Instructions
          </p>
          <div className="border-2 border-brand bg-brand">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b-2 border-surface/20">
              <span className="font-[family-name:var(--font-press-start)] text-[8px] text-surface/40 uppercase tracking-wider">
                Terminal
              </span>
              <CopyButton text={`claude mcp add bragfast --transport http ${MCP_URL}`} onDark />
            </div>
            {/* Body */}
            <div className="p-4 font-[family-name:var(--font-geist-mono)] text-sm leading-relaxed">
              <p className="text-surface/40 mb-3"># Add the brag.fast MCP server</p>
              <div className="bg-surface/10 px-3 py-2 -mx-1 mb-4">
                <span className="text-surface/60">$ </span>
                <span className="text-gold">{`claude mcp add bragfast --transport http ${MCP_URL}`}</span>
              </div>
              <p className="text-surface/40 mb-2"># Then authenticate</p>
              <div><span className="text-surface/60">$ </span><span className="text-surface/90">claude</span></div>
              <div className="text-gold">/mcp</div>
              <div className="text-emerald-400">&gt; select bragfast</div>
              <div className="text-emerald-400">&gt; Authenticate</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
