"use client";

import { useRouter } from "next/navigation";
import { PixelCard } from "@/components/dashboard/pixel-card";
import { PixelButton } from "@/components/dashboard/pixel-button";
import Image from "next/image";

export interface TemplateCardProps {
  id: string;
  name: string;
  isDefault: boolean;
  previewUrl?: string;
  onClone: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function TemplateCard({
  id,
  name,
  isDefault,
  previewUrl,
  onClone,
  onDelete,
}: TemplateCardProps) {
  const router = useRouter();

  return (
    <PixelCard className="flex flex-col gap-3">
      {/* Preview thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden border-2 border-[#4A3326] bg-gray-100 flex items-center justify-center">
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={`${name} preview`}
            fill
            className="object-cover"
          />
        ) : (
          <span className="text-xs text-[#4A3326]/40 font-[family-name:var(--font-press-start)]">
            No preview
          </span>
        )}
      </div>

      {/* Name + badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-[family-name:var(--font-press-start)] text-xs text-[#4A3326] truncate">
          {name}
        </span>
        {isDefault && (
          <span className="inline-block border-2 border-[#4A3326] px-2 py-0.5 font-[family-name:var(--font-press-start)] text-[10px] bg-[#F8AF3C] text-[#4A3326]">
            Default
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {isDefault ? (
          <PixelButton
            variant="ghost"
            onClick={() => onClone(id)}
          >
            Clone
          </PixelButton>
        ) : (
          <>
            <PixelButton
              variant="primary"
              onClick={() => router.push(`/dashboard/templates/${id}/edit`)}
            >
              Edit
            </PixelButton>
            {onDelete && (
              <PixelButton
                variant="danger"
                onClick={() => onDelete(id)}
              >
                Delete
              </PixelButton>
            )}
          </>
        )}
      </div>
    </PixelCard>
  );
}
