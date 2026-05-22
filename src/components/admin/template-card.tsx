"use client";

import { useRouter } from "next/navigation";
import { PixelCard } from "@/components/admin/pixel-card";
import { PixelButton } from "@/components/admin/pixel-button";
import { CopyButton } from "@/components/admin/copy-button";
import { TemplatePreview } from "@/components/admin/template-preview";
import { buildSampleBrand } from "@/lib/preview-sample";
import type { CanvasTemplateConfig } from "@/lib/templates/canvas-types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
export interface TemplateCardProps {
  id: string;
  displayId?: string;
  name: string;
  isDefault: boolean;
  previewUrl?: string;
  isV2?: boolean;
  config?: CanvasTemplateConfig;
  onClone: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function TemplateCard({
  id,
  displayId,
  name,
  isDefault,
  previewUrl,
  isV2 = true,
  config,
  onClone,
  onDelete,
}: TemplateCardProps) {
  const router = useRouter();

  return (
    <PixelCard className="flex flex-col gap-3">
      {/* Thumbnail */}
      <div className="relative w-full aspect-[16/9] overflow-hidden border-2 border-brand bg-cream">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : config && isV2 ? (
          <TemplatePreview
            config={config}
            brand={buildSampleBrand(config)}
            format="landscape"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center font-[family-name:var(--font-press-start)] text-[10px] text-brand/40">
            No preview
          </div>
        )}
      </div>

      {/* Name + badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-[family-name:var(--font-press-start)] text-xs text-brand truncate">
          {name}
        </span>
        {isDefault && (
          <span className="inline-block border-2 border-brand px-2 py-0.5 font-[family-name:var(--font-press-start)] text-[10px] bg-gold text-brand">
            Default
          </span>
        )}
      </div>

      {/* Template ID */}
      <p className="flex items-center gap-1 text-[10px] font-mono text-brand/80">
        Template ID: {displayId ?? id}
        <CopyButton text={displayId ?? id} />
      </p>

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
            {isV2 ? (
              <PixelButton
                variant="primary"
                onClick={() => router.push(`/admin/templates/${id}/edit`)}
              >
                Edit
              </PixelButton>
            ) : (
              <span className="inline-block border-2 border-brand/30 px-2 py-0.5 font-[family-name:var(--font-press-start)] text-[10px] text-brand/40">
                Legacy
              </span>
            )}
            <PixelButton
              variant="ghost"
              onClick={() => onClone(id)}
            >
              Clone
            </PixelButton>
            {onDelete && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <PixelButton variant="danger">
                    Delete
                  </PixelButton>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete template</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete &ldquo;{name}&rdquo;? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel asChild>
                      <PixelButton variant="ghost">Cancel</PixelButton>
                    </AlertDialogCancel>
                    <AlertDialogAction asChild>
                      <PixelButton variant="danger" onClick={() => onDelete(id)}>
                        Delete
                      </PixelButton>
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </>
        )}
      </div>
    </PixelCard>
  );
}
