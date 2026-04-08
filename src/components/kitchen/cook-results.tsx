"use client";

import { PixelCard } from "@/components/admin/pixel-card";
import { PixelButton } from "@/components/admin/pixel-button";
import type { ReleaseResult } from "@/lib/types";

const FORMAT_DIMS: Record<string, string> = {
  landscape: "1200×675",
  square: "1080×1080",
  portrait: "1080×1350",
};

interface CookResultsProps {
  result: ReleaseResult;
  onCookAgain: () => void;
}

export function CookResults({ result, onCookAgain }: CookResultsProps) {
  const isVideo = result.output === "video";

  if (isVideo && result.videos) {
    const entries = Object.entries(result.videos);
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map(([format, data]) => (
            <PixelCard key={format} className="space-y-3">
              <div className="aspect-video w-full overflow-hidden border border-brand/10 bg-surface">
                {/* Video results — captions not applicable for generated content */}
                <video
                  src={data.url}
                  controls
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <p className="font-[family-name:var(--font-press-start)] text-[10px] text-brand capitalize">
                  {format}
                </p>
                <p className="text-xs font-[family-name:var(--font-geist-mono)] text-brand/50 mt-0.5">
                  {data.dimensions ?? FORMAT_DIMS[format] ?? ""}
                </p>
              </div>
              <a href={data.url} download target="_blank" rel="noreferrer">
                <PixelButton variant="ghost" className="w-full justify-center text-[10px]">
                  Download
                </PixelButton>
              </a>
            </PixelCard>
          ))}
        </div>
        <ResultFooter creditsUsed={result.credits_used} remaining={result.credits_remaining} onCookAgain={onCookAgain} />
      </div>
    );
  }

  if (!isVideo && result.images) {
    const entries = Object.entries(result.images);
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map(([format, data]) => {
            const imageUrl = Array.isArray(data.slides) ? data.slides[0] : null;
            return (
              <PixelCard key={format} className="space-y-3">
                <div className="aspect-video w-full overflow-hidden border border-brand/10 bg-surface">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt={`${format} result`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-xs text-brand/30 font-[family-name:var(--font-geist-sans)]">
                        No image
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-[family-name:var(--font-press-start)] text-[10px] text-brand capitalize">
                    {format}
                  </p>
                  <p className="text-xs font-[family-name:var(--font-geist-mono)] text-brand/50 mt-0.5">
                    {data.dimensions ?? FORMAT_DIMS[format] ?? ""}
                  </p>
                </div>
                {imageUrl && (
                  <a href={imageUrl} download target="_blank" rel="noreferrer">
                    <PixelButton variant="ghost" className="w-full justify-center text-[10px]">
                      Download
                    </PixelButton>
                  </a>
                )}
              </PixelCard>
            );
          })}
        </div>
        <ResultFooter creditsUsed={result.credits_used} remaining={result.credits_remaining} onCookAgain={onCookAgain} />
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      <p className="text-sm font-[family-name:var(--font-geist-sans)] text-brand/60">
        Generation complete but no outputs found.
      </p>
      <div className="mt-4">
        <PixelButton onClick={onCookAgain}>Cook Again</PixelButton>
      </div>
    </div>
  );
}

function ResultFooter({
  creditsUsed,
  remaining,
  onCookAgain,
}: {
  creditsUsed: number;
  remaining: number;
  onCookAgain: () => void;
}) {
  return (
    <div className="flex items-center justify-between pt-2 border-t-2 border-brand/10">
      <p className="font-[family-name:var(--font-geist-mono)] text-xs text-brand/50">
        {creditsUsed} {creditsUsed === 1 ? "credit" : "credits"} used · {remaining} remaining
      </p>
      <PixelButton onClick={onCookAgain} className="text-[10px]">
        Cook Again
      </PixelButton>
    </div>
  );
}
