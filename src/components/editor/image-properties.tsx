"use client";
import { useEditor } from "./editor-context";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ImageProperties() {
  const { selectedObject, dispatch } = useEditor();
  if (!selectedObject) return null;
  if (selectedObject.type !== "image" && selectedObject.type !== "logo") return null;

  function update(property: string, value: string) {
    dispatch({ type: "UPDATE_PROPERTY", objectId: selectedObject!.id, property, value, allFormats: true });
  }

  return (
    <div className="space-y-3">
      <Label className="text-xs font-medium text-zinc-500 uppercase">Image</Label>

      {selectedObject.type === "image" && (
        <div className="space-y-1">
          <Label className="text-xs text-zinc-500">Device Frame</Label>
          <Select value={selectedObject.device || "browser"} onValueChange={(v) => update("device", v)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="browser">Browser</SelectItem>
              <SelectItem value="mobile">Mobile</SelectItem>
              <SelectItem value="none">None</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1">
        <Label className="text-xs text-zinc-500">Object Fit</Label>
        <Select value={selectedObject.objectFit || "cover"} onValueChange={(v) => update("objectFit", v)}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cover">Cover</SelectItem>
            <SelectItem value="contain">Contain</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
