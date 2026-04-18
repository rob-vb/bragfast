import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Branded panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-gold px-12 py-16">
        <div className="max-w-sm flex flex-col gap-6">
          <Image
            src="/logo-icon.svg"
            alt="brag.fast"
            width={64}
            height={66}
            priority
          />
          <h2 className="font-[family-name:var(--font-press-start)] text-lg xl:text-xl leading-relaxed text-brand">
            Stop building in silence.
          </h2>
          <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/80 leading-relaxed">
            Turn every release into branded images and video. Get your work seen. No design tools required.
          </p>
          <ul className="flex flex-col gap-2.5">
            {[
              "Ship, we plate it.",
              "On-brand, every time.",
              "30 free credits. No card.",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 font-[family-name:var(--font-geist-sans)] text-sm text-brand/90"
              >
                <span className="font-[family-name:var(--font-press-start)] text-[10px] text-brand shrink-0 mt-0.5">
                  ▸
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex w-full lg:w-1/2 items-center justify-center bg-surface px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 flex justify-center lg:hidden">
            <Image
              src="/logo-icon.svg"
              alt="brag.fast"
              width={64}
              height={66}
              priority
            />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
