"use client";
import { useRef, useState } from "react";
import { useEditor } from "./editor-context";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { BackgroundMode } from "@/lib/templates/canvas-types";

export function BackgroundSection() {
  const { state, dispatch } = useEditor();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const bg = state.config.background;
  const mode: BackgroundMode = bg?.mode ?? "color";

  function handleModeChange(value: string) {
    if (value === "color") {
      dispatch({ type: "SET_BACKGROUND", background: undefined });
    } else if (value === "image") {
      dispatch({ type: "SET_BACKGROUND", background: { mode: "image", imageUrl: "" } });
    } else if (value === "mesh_gradient") {
      dispatch({ type: "SET_BACKGROUND", background: { mode: "mesh_gradient", colors: ["", "", ""], positions: [] } });
    }
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
      dispatch({ type: "SET_BACKGROUND_IMAGE", imageUrl: url });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleGradientColorChange(index: number, value: string) {
    if (!bg || bg.mode !== "mesh_gradient") return;
    const colors: [string, string, string] = [bg.colors[0], bg.colors[1], bg.colors[2]];
    colors[index] = value;
    dispatch({ type: "SET_BACKGROUND", background: { ...bg, colors } });
  }

  const imageUrl = bg?.mode === "image" ? bg.imageUrl : "";
  const gradientColors = bg?.mode === "mesh_gradient" ? bg.colors : ["", "", ""];

  return (
    <div className="space-y-3">
      <Label className="text-xs font-medium text-zinc-500 uppercase">Background</Label>

      <Select value={mode} onValueChange={handleModeChange}>
        <SelectTrigger className="h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="color">Color</SelectItem>
          <SelectItem value="image">Image</SelectItem>
          <SelectItem value="mesh_gradient">Mesh Gradient</SelectItem>
        </SelectContent>
      </Select>

      {mode === "image" && (
        <div>
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
            {imageUrl ? (
              <div className="space-y-1.5">
                <div className="relative w-full h-20 rounded border border-zinc-200 overflow-hidden bg-zinc-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="Background" className="w-full h-full object-contain" />
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
                    onClick={() => dispatch({ type: "SET_BACKGROUND_IMAGE", imageUrl: "" })}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
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
            )}
          </div>
        </div>
      )}

      {mode === "mesh_gradient" && (
        <div className="space-y-2">
          {(["Color 1", "Color 2", "Color 3"] as const).map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <label className="text-xs text-zinc-500 w-20">{label}</label>
              <div className="flex items-center gap-1 flex-1">
                <input
                  type="color"
                  value={gradientColors[i] || "#000000"}
                  onChange={(e) => handleGradientColorChange(i, e.target.value)}
                  className="w-8 h-8 rounded border border-zinc-200 cursor-pointer"
                />
                <Input
                  value={gradientColors[i]}
                  onChange={(e) => handleGradientColorChange(i, e.target.value)}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={() => dispatch({ type: "RANDOMIZE_MESH" })}
          >
            Randomize
          </Button>
        </div>
      )}
    </div>
  );
}
