// Exception: rounded corners mimic social platform UI, not bragfast's zero-radius system
import Image from "next/image";

const AVATAR = "/demo/robvb.jpg";

function XCard({ videoUrl }: { videoUrl: string }) {
  return (
    <div className="rounded-2xl border border-brand/15 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.1)] overflow-hidden">
      {/* Author row */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-1">
        <Image src={AVATAR} alt="" width={32} height={32} className="h-8 w-8 rounded-full object-cover shrink-0" />
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-geist-sans)] text-xs font-semibold text-brand">Rob</p>
          <p className="font-[family-name:var(--font-geist-sans)] text-[10px] text-brand/40">@the_robvb</p>
        </div>
      </div>
      <p className="font-[family-name:var(--font-geist-sans)] text-[10px] text-brand/70 leading-relaxed px-3 py-1.5">
        Started posting these. My launches stopped flopping.
      </p>
      <div className="mx-3 mb-2 rounded-xl overflow-hidden border border-brand/10">
        <video autoPlay muted loop playsInline className="w-full h-auto block">
          <source src={videoUrl} type="video/mp4" />
        </video>
      </div>
      <div className="flex items-center gap-4 px-3 pb-2">
        {["💬", "🔁", "❤️", "📊"].map((icon) => (
          <span key={icon} className="text-[9px] text-brand/20 select-none">{icon}</span>
        ))}
      </div>
    </div>
  );
}

function LinkedInCard({ videoUrl }: { videoUrl: string }) {
  return (
    <div className="rounded-lg border border-brand/15 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.1)] overflow-hidden">
      {/* Author row */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-1">
        <Image src={AVATAR} alt="" width={32} height={32} className="h-8 w-8 rounded-md object-cover shrink-0" />
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-geist-sans)] text-xs font-semibold text-brand">Rob</p>
          <p className="font-[family-name:var(--font-geist-sans)] text-[10px] text-brand/40">Software Developer</p>
        </div>
      </div>
      <p className="font-[family-name:var(--font-geist-sans)] text-[10px] text-brand/70 leading-relaxed px-3 py-1.5">
        Looks like I hired a designer for this one. I didn&apos;t.
      </p>
      <div className="border-t border-brand/10">
        <video autoPlay muted loop playsInline className="w-full h-auto block">
          <source src={videoUrl} type="video/mp4" />
        </video>
      </div>
      <div className="flex items-center gap-4 px-3 py-2 border-t border-brand/10">
        {["👍", "💬", "🔄", "✉️"].map((icon) => (
          <span key={icon} className="text-[9px] text-brand/20 select-none">{icon}</span>
        ))}
      </div>
    </div>
  );
}

function InstagramCard({ videoUrl }: { videoUrl: string }) {
  return (
    <div className="rounded-lg border border-brand/15 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.1)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-gold to-brand/30 p-[2px] shrink-0">
          <Image src={AVATAR} alt="" width={28} height={28} className="h-full w-full rounded-full object-cover" />
        </div>
        <p className="font-[family-name:var(--font-geist-sans)] text-xs font-semibold text-brand">the_robvb</p>
      </div>
      <video autoPlay muted loop playsInline className="w-full h-auto block">
        <source src={videoUrl} type="video/mp4" />
      </video>
      <div className="flex items-center gap-4 px-3 py-2">
        {["❤️", "💬", "✉️"].map((icon) => (
          <span key={icon} className="text-[9px] text-brand/20 select-none">{icon}</span>
        ))}
      </div>
    </div>
  );
}

export function HeroSocialStack() {
  return (
    <div className="relative w-full h-[280px] sm:h-[340px] md:h-[420px]">
      {/* Instagram — back */}
      <div className="absolute right-0 top-0 w-[45%] sm:w-[50%] md:w-[52%] rotate-3 z-10">
        <InstagramCard videoUrl="/demo/video_instagram_example.mp4" />
      </div>
      {/* LinkedIn — middle */}
      <div className="absolute right-[12%] top-[8%] w-[50%] sm:w-[55%] md:w-[58%] rotate-1 z-20">
        <LinkedInCard videoUrl="/demo/video_linkedin_example.mp4" />
      </div>
      {/* X — front */}
      <div className="absolute left-0 top-[15%] w-[55%] sm:w-[60%] md:w-[62%] -rotate-2 z-30">
        <XCard videoUrl="/demo/video_x_example_compressed.mp4" />
      </div>
    </div>
  );
}
