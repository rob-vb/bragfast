import { TweetMockup } from "./tweet-mockup";

export function BeforeAfter() {
  return (
    <div className="grid md:grid-cols-2 gap-6 md:gap-10 max-w-4xl mx-auto">
      {/* Without */}
      <div className="flex flex-col gap-3">
        <span className="font-[family-name:var(--font-press-start)] text-[10px] text-brand/40 uppercase tracking-wider text-center">
          Without brag.fast
        </span>
        <TweetMockup
          author="yourproject"
          handle="yourproject"
          text="brag.fast is (a)live and cooking 🍳"
        />
      </div>

      {/* With */}
      <div className="flex flex-col gap-3">
        <span className="font-[family-name:var(--font-press-start)] text-[10px] text-gold uppercase tracking-wider text-center">
          With brag.fast
        </span>
        <TweetMockup
          author="yourproject"
          handle="yourproject"
          text="brag.fast is (a)live and cooking 🍳"
          videoUrl="/demo/video_x_example_compressed.mp4"
        />
      </div>
    </div>
  );
}
