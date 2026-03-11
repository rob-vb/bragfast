"use client";
import { useEditor } from "./editor-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus } from "lucide-react";
import type { ObjectType } from "@/lib/templates/canvas-types";

const ALL_TYPES: { type: ObjectType; label: string }[] = [
  { type: "text", label: "Text" },
  { type: "image", label: "Image" },
  { type: "logo", label: "Logo" },
];

export function AddObjectButton() {
  const { dispatch } = useEditor();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Plus className="w-4 h-4 mr-1" /> Add Object
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {ALL_TYPES.map(({ type, label }) => (
          <DropdownMenuItem key={type} onClick={() => dispatch({ type: "ADD_OBJECT", objectType: type })}>
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
