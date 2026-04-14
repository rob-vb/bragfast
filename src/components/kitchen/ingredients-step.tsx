"use client";

import { useRef, useState } from "react";
import type { CanvasTemplateConfig } from "@/lib/templates/canvas-types";
import type { ObjectModification } from "@/lib/types";

interface IngredientsStepProps {
  templateConfig: CanvasTemplateConfig;
  objectContent: Record<string, ObjectModification>;
  onContentChange: (id: string, mod: ObjectModification) => void;
  outputType?: "image" | "video";
}

export function IngredientsStep({
  templateConfig,
  objectContent,
  onContentChange,
  outputType = "image",
}: IngredientsStepProps) {
  // Use landscape as the canonical object list
  const objects = templateConfig.formats.landscape?.objects ?? [];
  const editableObjects = objects.filter((o) => o.type !== "logo");

  if (editableObjects.length === 0) {
    return (
      <p className="text-sm font-[family-name:var(--font-geist-sans)] text-brand/60 py-4">
        No editable fields for this template.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {editableObjects.map((obj) => {
        const mod = objectContent[obj.id] ?? { id: obj.id };

        if (obj.type === "text") {
          const isLong = obj.height > 80 || obj.name.toLowerCase().includes("desc");
          return (
            <div key={obj.id} className="space-y-1">
              <label className="font-[family-name:var(--font-press-start)] text-[10px] text-brand capitalize block">
                {obj.name}
              </label>
              {isLong ? (
                <textarea
                  className="w-full border-2 border-brand px-3 py-2 text-sm font-[family-name:var(--font-geist-sans)] text-brand bg-white resize-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                  rows={3}
                  placeholder={obj.previewText ?? `Enter ${obj.name}...`}
                  value={mod.text ?? ""}
                  onChange={(e) =>
                    onContentChange(obj.id, { ...mod, id: obj.id, text: e.target.value })
                  }
                />
              ) : (
                <input
                  type="text"
                  className="w-full border-2 border-brand px-3 py-2 text-sm font-[family-name:var(--font-geist-sans)] text-brand bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
                  placeholder={obj.previewText ?? `Enter ${obj.name}...`}
                  value={mod.text ?? ""}
                  onChange={(e) =>
                    onContentChange(obj.id, { ...mod, id: obj.id, text: e.target.value })
                  }
                />
              )}
            </div>
          );
        }

        if (obj.type === "visual") {
          return (
            <VisualField
              key={obj.id}
              label={obj.name}
              mod={mod}
              outputType={outputType}
              onChange={(updated) => onContentChange(obj.id, { ...updated, id: obj.id })}
            />
          );
        }

        return null;
      })}
    </div>
  );
}

// ─── Visual field ─────────────────────────────────────────────────────────────

interface VisualFieldProps {
  label: string;
  mod: ObjectModification;
  outputType: "image" | "video";
  onChange: (mod: ObjectModification) => void;
}

function VisualField({ label, mod, outputType, onChange }: VisualFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState(mod.image_url ?? "");

  async function handleFile(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/v1/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      const url = data.url ?? data.image_url ?? data.file_url;
      if (!url) throw new Error("No URL returned");
      setUrlInput(url);
      onChange({ ...mod, image_url: url });
    } catch {
      setUploadError("Upload failed. Try again or use a URL.");
    } finally {
      setUploading(false);
    }
  }

  async function handleVideoFile(file: File) {
    setUploadingVideo(true);
    setVideoError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/v1/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Upload failed");
      }
      const data = await res.json();
      const url = data.url ?? data.file_url;
      if (!url) throw new Error("No URL returned");
      onChange({ ...mod, video_url: url });
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingVideo(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleUrlBlur() {
    if (urlInput !== mod.image_url) {
      onChange({ ...mod, image_url: urlInput || undefined });
    }
  }

  const hasVideo = !!mod.video_url;
  const showVideoSlot = outputType === "video";

  return (
    <div className="space-y-2">
      <label className="font-[family-name:var(--font-press-start)] text-[10px] text-brand capitalize block">
        {label}
      </label>

      {/* Drop zone */}
      <div
        className={`
          border-2 border-dashed border-brand/30 bg-surface p-4 text-center cursor-pointer
          hover:border-brand/60 transition-colors
          ${uploading ? "opacity-60" : ""}
        `}
        onClick={() => !uploading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {uploading ? (
          <p className="text-xs font-[family-name:var(--font-geist-sans)] text-brand/60 animate-pulse">
            Uploading...
          </p>
        ) : mod.image_url && mod.image_url.startsWith("http") ? (
          <div className="space-y-1 relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={mod.image_url}
              alt="preview"
              className="max-h-24 mx-auto object-contain"
            />
            {hasVideo && (
              <span className="absolute top-0 right-0 bg-brand text-white text-[10px] px-1.5 py-0.5">
                🎬
              </span>
            )}
            <p className="text-[10px] font-[family-name:var(--font-geist-sans)] text-brand/40">
              Click to replace
            </p>
          </div>
        ) : (
          <p className="text-xs font-[family-name:var(--font-geist-sans)] text-brand/50">
            Drop image here or click to upload
          </p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>

      {uploadError && (
        <p className="text-[10px] font-[family-name:var(--font-geist-sans)] text-red-600">
          {uploadError}
        </p>
      )}

      {/* URL input */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-[family-name:var(--font-geist-sans)] text-brand/50 whitespace-nowrap">
          or URL
        </span>
        <input
          type="url"
          className="flex-1 border-2 border-brand/30 px-2 py-1.5 text-xs font-[family-name:var(--font-geist-mono)] text-brand bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold focus:border-brand"
          placeholder="https://..."
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onBlur={handleUrlBlur}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleUrlBlur();
            }
          }}
        />
      </div>

      {showVideoSlot && (
        <div className="space-y-1 pt-1">
          <label className="text-[10px] font-[family-name:var(--font-geist-sans)] text-brand/60 block">
            Video (optional, MP4/WebM/MOV ≤ 50 MB)
          </label>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleVideoFile(file);
              e.target.value = "";
            }}
          />
          {hasVideo ? (
            <div className="flex items-center gap-2 border-2 border-brand/30 px-2 py-1.5 bg-white">
              <span className="text-sm">🎬</span>
              <span className="text-[10px] font-[family-name:var(--font-geist-mono)] text-brand/70 truncate flex-1">
                Video attached
              </span>
              <button
                type="button"
                className="text-[10px] font-[family-name:var(--font-geist-sans)] text-brand/60 hover:text-red-600 px-1"
                onClick={() => videoInputRef.current?.click()}
                disabled={uploadingVideo}
              >
                Replace
              </button>
              <button
                type="button"
                className="text-[10px] font-[family-name:var(--font-geist-sans)] text-red-500 hover:text-red-600 px-1"
                onClick={() => onChange({ ...mod, video_url: undefined })}
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="w-full border-2 border-dashed border-brand/30 bg-surface px-2 py-2 text-[10px] font-[family-name:var(--font-geist-sans)] text-brand/60 hover:border-brand/60 transition-colors"
              onClick={() => videoInputRef.current?.click()}
              disabled={uploadingVideo}
            >
              {uploadingVideo ? "Uploading video..." : "Upload video"}
            </button>
          )}
          {videoError && (
            <p className="text-[10px] font-[family-name:var(--font-geist-sans)] text-red-600">
              {videoError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
