import Image from "next/image";

// Exception: rounded corners mimic Twitter/X UI, not bragfast's zero-radius system
export function TweetMockup({
  author,
  handle,
  text,
  imageUrl,
  videoUrl,
  imagePriority,
}: {
  author: string;
  handle: string;
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  imagePriority?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-brand/15 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
      {/* Author row */}
      <div className="flex items-center gap-2.5 px-4 pt-3.5 pb-1">
        <div className="h-10 w-10 rounded-full bg-brand/10 border border-brand/10 flex items-center justify-center shrink-0">
          <span className="font-[family-name:var(--font-press-start)] text-[8px] text-brand/40">
            {author.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-geist-sans)] text-sm font-semibold text-brand truncate">
            {author}
          </p>
          <p className="font-[family-name:var(--font-geist-sans)] text-xs text-brand/50 truncate">
            @{handle}
          </p>
        </div>
      </div>

      {/* Tweet text */}
      <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/90 leading-relaxed px-4 py-2.5">
        {text}
      </p>

      {/* Optional video */}
      {videoUrl && (
        <div className="mx-4 mb-3.5 rounded-xl overflow-hidden border border-brand/10">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-auto block"
          >
            <source src={videoUrl} type="video/mp4" />
          </video>
        </div>
      )}

      {/* Optional image (only if no video) */}
      {!videoUrl && imageUrl && (
        <div className="mx-4 mb-3.5 rounded-xl overflow-hidden border border-brand/10">
          <Image
            src={imageUrl}
            alt="Release announcement image"
            width={1200}
            height={675}
            sizes="(max-width: 768px) 100vw, 50vw"
            priority={imagePriority}
            className="w-full h-auto"
          />
        </div>
      )}

      {/* Engagement bar */}
      <div className="flex items-center gap-6 px-4 pb-3 pt-1">
        {["💬", "🔁", "❤️", "📊"].map((icon) => (
          <span
            key={icon}
            className="text-xs text-brand/25 select-none"
          >
            {icon}
          </span>
        ))}
      </div>
    </div>
  );
}
