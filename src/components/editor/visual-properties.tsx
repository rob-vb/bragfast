"use client";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useEditor } from "./editor-context";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

function RadiusInput({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  return (
    <div className="relative">
      <Input
        type="number"
        min={0}
        max={999}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="h-7 w-full text-xs text-center pr-1 pl-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        title={label}
      />
    </div>
  );
}

function LinkIcon({ linked }: { linked: boolean }) {
  if (linked) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

function CornerIndicator({ corner }: { corner: "tl" | "tr" | "br" | "bl" }) {
  const paths: Record<string, string> = {
    tl: "M 2 7 L 2 4 Q 2 2 4 2 L 7 2",
    tr: "M 7 2 L 10 2 Q 12 2 12 4 L 12 7",
    br: "M 12 7 L 12 10 Q 12 12 10 12 L 7 12",
    bl: "M 7 12 L 4 12 Q 2 12 2 10 L 2 7",
  };

  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="text-zinc-400">
      <rect x="2" y="2" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      <path d={paths[corner]} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function VisualProperties() {
  const { selectedObject, dispatch } = useEditor();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const uniformRadius = selectedObject?.borderRadius ?? 0;
  const tl = selectedObject?.borderRadiusTL ?? uniformRadius;
  const tr = selectedObject?.borderRadiusTR ?? uniformRadius;
  const br = selectedObject?.borderRadiusBR ?? uniformRadius;
  const bl = selectedObject?.borderRadiusBL ?? uniformRadius;

  const cornersMatch = tl === tr && tr === br && br === bl;
  const [unlinked, setUnlinked] = useState(!cornersMatch);

  const objectId = selectedObject?.id;
  useEffect(() => {
    setUnlinked(!cornersMatch);
  }, [objectId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!selectedObject) return null;
  if (selectedObject.type !== "visual" && selectedObject.type !== "logo") return null;

  const isVisual = selectedObject.type === "visual";
  const imageFrame = selectedObject.imageFrame || "none";
  const hasDeviceFrame = imageFrame !== "none";
  const imageFrameColor = selectedObject.imageFrameColor || (imageFrame === "mobile" ? "#1A1A1A" : "#E8E8E8");

  function update(property: string, value: unknown) {
    dispatch({ type: "UPDATE_PROPERTY", objectId: selectedObject!.id, property, value, allFormats: true });
  }

  function updatePerFormat(property: string, value: unknown) {
    dispatch({ type: "UPDATE_PROPERTY", objectId: selectedObject!.id, property, value, allFormats: false });
  }

  async function handleFileUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/v1/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }
      const { url } = await res.json();
      update("src", url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleVideoUpload(file: File) {
    setUploadingVideo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/v1/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }
      const { url } = await res.json();
      update("video_url", url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingVideo(false);
    }
  }

  function setUniformRadius(v: number) {
    update("borderRadius", v);
    update("borderRadiusTL", v);
    update("borderRadiusTR", v);
    update("borderRadiusBR", v);
    update("borderRadiusBL", v);
  }

  function setCorner(corner: string, v: number) {
    update(corner, v);
  }

  function toggleLinked() {
    if (unlinked) {
      setUniformRadius(tl);
    }
    setUnlinked(!unlinked);
  }

  return (
    <div className="space-y-3">
      <Label className="text-xs font-medium text-zinc-500 uppercase">Visual</Label>

      {isVisual && (
        <div className="space-y-1">
          <Label className="text-xs text-zinc-500">Device Frame</Label>
          <Select value={imageFrame} onValueChange={(v) => {
            update("imageFrame", v);
            if (v === "mobile") update("imageFrameColor", "#1A1A1A");
            else if (v === "browser") update("imageFrameColor", "#E8E8E8");
          }}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="browser">Browser</SelectItem>
              <SelectItem value="mobile">Mobile</SelectItem>
            </SelectContent>
          </Select>
          {hasDeviceFrame && (
            <div className="flex items-center gap-2 mt-1.5">
              <button
                type="button"
                onClick={() => update("imageFrameColor", "#E8E8E8")}
                className={`w-6 h-6 rounded-full border-2 transition-colors flex-shrink-0 ${
                  imageFrameColor === "#E8E8E8"
                    ? "border-blue-500"
                    : "border-zinc-200 hover:border-zinc-300"
                }`}
                style={{ backgroundColor: "#E8E8E8" }}
                title="Light"
              />
              <button
                type="button"
                onClick={() => update("imageFrameColor", "#1A1A1A")}
                className={`w-6 h-6 rounded-full border-2 transition-colors flex-shrink-0 ${
                  imageFrameColor === "#1A1A1A"
                    ? "border-blue-500"
                    : "border-zinc-200 hover:border-zinc-300"
                }`}
                style={{ backgroundColor: "#1A1A1A" }}
                title="Dark"
              />
              <div className="flex items-center gap-1 flex-1">
                <input
                  type="color"
                  value={imageFrameColor}
                  onChange={(e) => update("imageFrameColor", e.target.value)}
                  className="w-7 h-7 rounded border border-zinc-200 cursor-pointer flex-shrink-0"
                />
                <Input
                  value={imageFrameColor}
                  onChange={(e) => update("imageFrameColor", e.target.value)}
                  className="h-7 text-xs font-mono"
                  placeholder="#E8E8E8"
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-1">
        <Label className="text-xs text-zinc-500">Object Fit</Label>
        <Select value={selectedObject.objectFit || "cover"} onValueChange={(v) => updatePerFormat("objectFit", v)}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cover">Cover</SelectItem>
            <SelectItem value="contain">Contain</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs text-zinc-500">Anchor X</Label>
          <Select value={selectedObject.anchorX || "center"} onValueChange={(v) => updatePerFormat("anchorX", v)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-zinc-500">Anchor Y</Label>
          <Select value={selectedObject.anchorY || "center"} onValueChange={(v) => updatePerFormat("anchorY", v)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="top">Top</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="bottom">Bottom</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {(!isVisual || !hasDeviceFrame) && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-zinc-500">Border Radius</Label>
            <button
              type="button"
              onClick={toggleLinked}
              className={`p-1 rounded transition-colors ${
                unlinked
                  ? "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
                  : "text-blue-500 hover:text-blue-600 hover:bg-blue-50"
              }`}
              title={unlinked ? "Link all corners" : "Edit corners individually"}
            >
              <LinkIcon linked={!unlinked} />
            </button>
          </div>

          {!unlinked ? (
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <RadiusInput
                  value={uniformRadius}
                  onChange={setUniformRadius}
                  label="All corners"
                />
              </div>
              <span className="text-[10px] text-zinc-400">px</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex items-center gap-1">
                <CornerIndicator corner="tl" />
                <RadiusInput value={tl} onChange={(v) => setCorner("borderRadiusTL", v)} label="Top left" />
              </div>
              <div className="flex items-center gap-1">
                <CornerIndicator corner="tr" />
                <RadiusInput value={tr} onChange={(v) => setCorner("borderRadiusTR", v)} label="Top right" />
              </div>
              <div className="flex items-center gap-1">
                <CornerIndicator corner="bl" />
                <RadiusInput value={bl} onChange={(v) => setCorner("borderRadiusBL", v)} label="Bottom left" />
              </div>
              <div className="flex items-center gap-1">
                <CornerIndicator corner="br" />
                <RadiusInput value={br} onChange={(v) => setCorner("borderRadiusBR", v)} label="Bottom right" />
              </div>
            </div>
          )}
        </div>
      )}

      {isVisual && (
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-xs text-zinc-500">Background</Label>
            <p className="text-[10px] text-zinc-400">No animation in video</p>
          </div>
          <Switch
            checked={selectedObject.background ?? false}
            onCheckedChange={(checked) => update("background", checked)}
          />
        </div>
      )}

      {isVisual && (
        <>
          <div className="border-t border-zinc-200 pt-3">
            <Label className="text-xs font-medium text-zinc-500 uppercase">Static Image</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
                e.target.value = "";
              }}
            />
            <div className="mt-1.5">
              {selectedObject.src ? (
                <div className="space-y-1.5">
                  <div className="relative w-full h-20 rounded border border-zinc-200 overflow-hidden bg-zinc-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selectedObject.src} alt="Static" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      Replace
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs text-red-500 hover:text-red-600"
                      onClick={() => update("src", undefined)}
                    >
                      Remove
                    </Button>
                  </div>
                  <p className="text-[10px] text-zinc-400">Baked into template — always rendered</p>
                </div>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <span className="flex items-center gap-1.5">
                        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Uploading…
                      </span>
                    ) : (
                      "Upload Image"
                    )}
                  </Button>
                  <p className="mt-1.5 text-[10px] text-zinc-400">Upload to bake into template. Leave empty for API slot.</p>
                </>
              )}
            </div>
          </div>

          <div className="border-t border-zinc-200 pt-3">
            <Label className="text-xs font-medium text-zinc-500 uppercase">Static Video</Label>
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleVideoUpload(file);
                e.target.value = "";
              }}
            />
            <div className="mt-1.5">
              {selectedObject.video_url ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded border border-zinc-200 bg-zinc-50">
                    <span className="text-sm">🎬</span>
                    <span className="text-xs text-zinc-600 truncate flex-1">Video attached</span>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      onClick={() => videoInputRef.current?.click()}
                      disabled={uploadingVideo}
                    >
                      Replace
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs text-red-500 hover:text-red-600"
                      onClick={() => update("video_url", undefined)}
                    >
                      Remove
                    </Button>
                  </div>
                  <p className="text-[10px] text-zinc-400">Plays in video output only</p>
                </div>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-xs"
                    onClick={() => videoInputRef.current?.click()}
                    disabled={uploadingVideo}
                  >
                    {uploadingVideo ? (
                      <span className="flex items-center gap-1.5">
                        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Uploading…
                      </span>
                    ) : (
                      "Upload Video"
                    )}
                  </Button>
                  <p className="mt-1.5 text-[10px] text-zinc-400">MP4/WebM/MOV up to 50 MB. Used only in video output.</p>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
