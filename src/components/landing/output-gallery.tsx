import Image from "next/image";
import { LazyVideo } from "./lazy-video";

const EXAMPLES = [
  { src: "/demo/standard-browser-inter-landscape.jpg", alt: "Standard browser template, landscape", w: 1200, h: 675 },
  { src: "/demo/split-browser-raleway-landscape.jpg", alt: "Split browser template, landscape", w: 1200, h: 675 },
  { src: "/demo/hero-saira-landscape.jpg", alt: "Hero template, landscape", w: 1200, h: 675 },
  { src: "/demo/standard-mobile-inter-square.jpg", alt: "Standard mobile template, square", w: 1080, h: 1080 },
];

export function OutputGallery() {
  return (
    <div className="flex flex-col gap-12">
      {/* Image grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {EXAMPLES.map((img) => (
          <div
            key={img.src}
            className="border-2 border-brand shadow-[3px_3px_0_var(--color-brand)] overflow-hidden hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            <Image
              src={img.src}
              alt={img.alt}
              width={img.w}
              height={img.h}
              sizes="(max-width: 768px) 50vw, 25vw"
              loading="lazy"
              className="w-full h-auto block"
            />
          </div>
        ))}
      </div>

      {/* Video showcase */}
      <div className="max-w-2xl mx-auto w-full">
        <div className="border-2 border-brand bg-white p-4 shadow-[4px_4px_0_var(--color-brand)]">
          <LazyVideo
            src="/demo/github_release_demo_compressed.mp4"
            className="w-full rounded-sm border border-brand"
          />
        </div>
        <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/50 text-center mt-3">
          Videos too. 30fps, animated transitions, same one-call API.
        </p>
      </div>
    </div>
  );
}
