import { useEffect, useRef, useState } from "react";
import { uploadLocalMedia } from "../media";
import type { DraftObjectContent } from "../types";

const UNSUPPORTED = "Unsupported file type. Use PNG, JPG, WebP, SVG, MP4, MOV, or WebM.";
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);

interface VisualFieldProps {
  label: string;
  value: DraftObjectContent;
  brandLogoUrl?: string;
  onChange: (value: DraftObjectContent) => void;
}

export function VisualField({ label, value, brandLogoUrl, onChange }: VisualFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localValue, setLocalValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const previewUrl = localValue.image_url ?? localValue.video_url ?? brandLogoUrl;
  const isVideo = !!localValue.video_url;

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  async function handleFile(file: File) {
    setError(null);
    if (!IMAGE_TYPES.has(file.type) && !VIDEO_TYPES.has(file.type)) {
      setError(UNSUPPORTED);
      return;
    }

    setUploading(true);
    try {
      const uploaded = await uploadLocalMedia(file);
      const next = VIDEO_TYPES.has(file.type)
        ? { video_url: uploaded.url }
        : { image_url: uploaded.url };
      setLocalValue(next);
      onChange(next);
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) void handleFile(file);
  }

  return (
    <div className="space-y-2">
      <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--workspace-sage)]">
        {label}
      </span>
      <button
        type="button"
        className="flex min-h-[132px] w-full flex-col items-center justify-center rounded-[8px] border border-dashed border-[var(--workspace-border)] bg-white p-3 text-center text-[14px] text-[var(--workspace-muted)] transition-colors hover:border-[var(--workspace-forest)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--workspace-lime)]"
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(event) => event.preventDefault()}
      >
        {uploading ? (
          <span>Uploading...</span>
        ) : previewUrl ? (
          isVideo ? (
            <video
              src={previewUrl}
              className="max-h-28 max-w-full rounded-[6px]"
              muted
              loop
              autoPlay
              playsInline
            />
          ) : (
            <img src={previewUrl} alt={`${label} preview`} className="max-h-28 max-w-full rounded-[6px] object-contain" />
          )
        ) : (
          <span>Drop media here or browse files</span>
        )}
      </button>
      <input
        ref={inputRef}
        aria-label={`Browse media for ${label}`}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,video/mp4,video/quicktime,video/webm"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
          event.currentTarget.value = "";
        }}
      />
      {previewUrl ? (
        <button
          type="button"
          className="text-[12px] font-semibold text-red-600"
          onClick={() => {
            setLocalValue({});
            onChange({});
          }}
        >
          Clear media
        </button>
      ) : null}
      {error ? <p className="text-[12px] text-red-600">{error}</p> : null}
    </div>
  );
}
