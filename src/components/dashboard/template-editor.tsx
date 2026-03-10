"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronUp, ChevronDown, X } from "lucide-react";
import type { TemplateConfig, Block, BlockType, Spacing } from "@/lib/templates/config-types";
import { TemplatePreview } from "./template-preview";
import { BlockProperties } from "./block-properties";
import { PixelButton } from "./pixel-button";

interface TemplateEditorProps {
  templateId: string;
  initialName: string;
  initialConfig: TemplateConfig;
  brands: Array<{
    id: string;
    name: string;
    colors: { background: string; text: string; primary: string };
  }>;
}

const ALL_BLOCK_TYPES: { value: BlockType; label: string }[] = [
  { value: "title", label: "Title" },
  { value: "description", label: "Description" },
  { value: "image", label: "Image" },
  { value: "logo", label: "Logo" },
  { value: "productName", label: "Product Name" },
];

const MAX_BLOCKS = 8;

const BLOCK_TYPE_LABELS: Record<string, string> = {
  title: "Title",
  description: "Description",
  image: "Image",
  logo: "Logo",
  productName: "Product Name",
};

const DEFAULT_BRAND_COLORS = {
  background: "#1a1a2e",
  text: "#ffffff",
  primary: "#e94560",
};

function defaultBlock(type: BlockType): Block {
  const base: Block = { type, alignment: "center" };
  if (type === "title" || type === "description" || type === "productName") {
    base.fontSize = "medium";
  }
  if (type === "image") {
    base.device = "browser";
    base.display = "inline";
  }
  return base;
}

export function TemplateEditor({
  templateId,
  initialName,
  initialConfig,
  brands,
}: TemplateEditorProps) {
  const [name, setName] = useState(initialName);
  const [config, setConfig] = useState<TemplateConfig>(initialConfig);
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null);
  const [format, setFormat] = useState<"landscape" | "square" | "portrait">("landscape");
  const [previewBrandIndex, setPreviewBrandIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const brandColors =
    brands.length > 0 ? brands[previewBrandIndex]?.colors : undefined;

  // --- Handlers ---

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/v1/templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, config }),
      });
      if (!res.ok) throw new Error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handlePreviewReal() {
    setPreviewing(true);
    try {
      const res = await fetch(`/api/v1/templates/${templateId}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format }),
      });
      if (!res.ok) throw new Error("Preview failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } finally {
      setPreviewing(false);
    }
  }

  function updateBlock(index: number, updated: Block) {
    setConfig((prev) => {
      const blocks = [...prev.blocks];
      blocks[index] = updated;
      return { ...prev, blocks };
    });
  }

  function removeBlock(index: number) {
    if (selectedBlockIndex === index) setSelectedBlockIndex(null);
    else if (selectedBlockIndex !== null && selectedBlockIndex > index) {
      setSelectedBlockIndex(selectedBlockIndex - 1);
    }
    setConfig((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((_, i) => i !== index),
    }));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= config.blocks.length) return;
    setConfig((prev) => {
      const blocks = [...prev.blocks];
      [blocks[index], blocks[newIndex]] = [blocks[newIndex], blocks[index]];
      return { ...prev, blocks };
    });
    if (selectedBlockIndex === index) setSelectedBlockIndex(newIndex);
    else if (selectedBlockIndex === newIndex) setSelectedBlockIndex(index);
  }

  function addBlock(type: BlockType) {
    if (config.blocks.length >= MAX_BLOCKS) return;
    setConfig((prev) => ({
      ...prev,
      blocks: [...prev.blocks, defaultBlock(type)],
    }));
  }

  const usedTypes = new Set(config.blocks.map((b) => b.type));
  const availableTypes = ALL_BLOCK_TYPES.filter((t) => !usedTypes.has(t.value));

  const selectedBlock =
    selectedBlockIndex !== null ? config.blocks[selectedBlockIndex] : null;

  // --- Render ---

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
        <Link
          href="/dashboard/templates"
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          &larr; Back to Templates
        </Link>
        <span className="text-sm font-semibold truncate max-w-[40%]">{name}</span>
        <PixelButton onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </PixelButton>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-64 border-r border-gray-700 overflow-y-auto flex-shrink-0">
          <div className="flex flex-col gap-5 p-4">
            {/* Name */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-gray-800 text-white text-sm rounded px-2 py-1.5 border border-gray-700 focus:border-gray-500 focus:outline-none"
              />
            </div>

            {/* Background */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                Background
              </label>
              <div className="flex gap-1">
                <button
                  onClick={() =>
                    setConfig((prev) => ({ ...prev, background: "brand" }))
                  }
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    config.background === "brand"
                      ? "bg-white text-black"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                >
                  Brand
                </button>
                <input
                  type="color"
                  value={config.background === "brand" ? "#1a1a2e" : config.background}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, background: e.target.value }))
                  }
                  className="w-8 h-8 rounded bg-gray-800 border border-gray-700 cursor-pointer"
                />
              </div>
            </div>

            {/* Spacing */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                Spacing
              </label>
              <div className="flex gap-1">
                {(["compact", "normal", "spacious"] as Spacing[]).map((s) => (
                  <button
                    key={s}
                    onClick={() =>
                      setConfig((prev) => ({ ...prev, spacing: s }))
                    }
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      config.spacing === s
                        ? "bg-white text-black"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Blocks */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                Blocks
              </label>
              <div className="flex flex-col gap-1">
                {config.blocks.map((block, i) => (
                  <div
                    key={`${block.type}-${i}`}
                    onClick={() => setSelectedBlockIndex(i)}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs cursor-pointer transition-colors ${
                      selectedBlockIndex === i
                        ? "bg-gray-600 text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveBlock(i, -1);
                      }}
                      disabled={i === 0}
                      className="p-0.5 hover:text-white disabled:opacity-30"
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveBlock(i, 1);
                      }}
                      disabled={i === config.blocks.length - 1}
                      className="p-0.5 hover:text-white disabled:opacity-30"
                    >
                      <ChevronDown size={12} />
                    </button>
                    <span className="flex-1 truncate">
                      {BLOCK_TYPE_LABELS[block.type] ?? block.type}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeBlock(i);
                      }}
                      className="p-0.5 hover:text-red-400"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Add Block */}
            {availableTypes.length > 0 && config.blocks.length < MAX_BLOCKS && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                  Add Block
                </label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      addBlock(e.target.value as BlockType);
                      e.target.value = "";
                    }
                  }}
                  defaultValue=""
                  className="bg-gray-800 text-white text-xs rounded px-2 py-1.5 border border-gray-700 focus:border-gray-500 focus:outline-none"
                >
                  <option value="" disabled>
                    Select type...
                  </option>
                  {availableTypes.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Block Properties */}
            {selectedBlock && selectedBlockIndex !== null && (
              <div className="border-t border-gray-700 pt-3">
                <BlockProperties
                  block={selectedBlock}
                  onChange={(updated) => updateBlock(selectedBlockIndex, updated)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Center Area */}
        <div className="flex-1 flex flex-col items-center overflow-y-auto p-6 gap-4">
          {/* Preview Canvas */}
          <div className="w-full max-w-2xl">
            <TemplatePreview
              config={config}
              format={format}
              brandColors={brandColors ?? DEFAULT_BRAND_COLORS}
            />
          </div>

          {/* Format Switcher */}
          <div className="flex gap-2">
            {(["landscape", "square", "portrait"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  format === f
                    ? "bg-white text-black"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Brand Selector */}
          {brands.length > 0 ? (
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                Brand
              </label>
              <select
                value={previewBrandIndex}
                onChange={(e) => setPreviewBrandIndex(Number(e.target.value))}
                className="bg-gray-800 text-white text-xs rounded px-2 py-1.5 border border-gray-700 focus:border-gray-500 focus:outline-none"
              >
                {brands.map((b, i) => (
                  <option key={b.id} value={i}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-xs text-gray-500">
              No brands available. Using placeholder colors.
            </p>
          )}

          {/* Preview Real Output */}
          <PixelButton onClick={handlePreviewReal} disabled={previewing} variant="ghost">
            {previewing ? "Generating..." : "Preview Real Output"}
          </PixelButton>
        </div>
      </div>
    </div>
  );
}
