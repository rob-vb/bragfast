"use client";

import "./brand-kit-mockup.css";

const LOOP = "10s infinite both";

const SWATCHES = [
  { color: "#4A3326", anim: "brand-swatch-1" },
  { color: "#F8AF3C", anim: "brand-swatch-2" },
  { color: "#FFF8F0", anim: "brand-swatch-3" },
  { color: "#2D5A3D", anim: "brand-swatch-4" },
];

export function BrandKitMockup() {
  return (
    <div aria-hidden="true" className="brand-kit-mockup">
      <div className="border-2 border-brand bg-white shadow-[4px_4px_0_var(--color-brand)]">
        {/* Top bar */}
        <div className="border-b-2 border-brand px-3 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="block h-2 w-2 border border-brand bg-gold" />
            <span className="block h-2 w-2 border border-brand bg-surface" />
            <span className="block h-2 w-2 border border-brand bg-surface" />
          </div>
          <span className="font-[family-name:var(--font-press-start)] text-[8px] text-brand/50">
            Brand Kit
          </span>
          <span className="w-10" />
        </div>

        <div className="p-4 md:p-5">
          {/* Config panel */}
          <div className="flex flex-col gap-3">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 md:w-12 md:h-12 border-2 border-brand/30 bg-surface/50 flex items-center justify-center"
                style={{ animation: `brand-logo ${LOOP}`, opacity: 0 }}
              >
                <span className="font-[family-name:var(--font-press-start)] text-[6px] text-brand/30">
                  LOGO
                </span>
              </div>
              <div>
                <span className="font-[family-name:var(--font-press-start)] text-[7px] text-brand/40 uppercase">
                  Logo
                </span>
              </div>
            </div>

            {/* Color swatches */}
            <div>
              <span className="font-[family-name:var(--font-press-start)] text-[7px] text-brand/40 uppercase block mb-1.5">
                Colors
              </span>
              <div className="flex gap-2">
                {SWATCHES.map((s) => (
                  <div
                    key={s.color}
                    className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-brand/30"
                    style={{
                      backgroundColor: s.color,
                      animation: `${s.anim} ${LOOP}`,
                      opacity: 0,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Font */}
            <div
              style={{ animation: `brand-font ${LOOP}`, opacity: 0 }}
            >
              <span className="font-[family-name:var(--font-press-start)] text-[7px] text-brand/40 uppercase block mb-1">
                Font
              </span>
              <span className="font-[family-name:var(--font-geist-sans)] text-sm text-brand font-bold">
                Inter Bold
              </span>
            </div>
          </div>

          {/* Arrow + output preview */}
          <div
            className="mt-4 pt-3 border-t-2 border-brand/10"
            style={{ animation: `brand-output ${LOOP}`, opacity: 0 }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="font-[family-name:var(--font-press-start)] text-brand/30 text-xs">
                &darr;
              </span>
              <span className="font-[family-name:var(--font-press-start)] text-[7px] text-brand/40">
                Output
              </span>
            </div>
            <div className="border-2 border-brand/20 bg-[#4A3326] p-2 flex items-center gap-2">
              <div className="w-5 h-5 border border-[#FFF8F0]/30 bg-[#FFF8F0]/10 flex items-center justify-center">
                <span className="font-[family-name:var(--font-press-start)] text-[4px] text-[#FFF8F0]/50">
                  L
                </span>
              </div>
              <span className="font-[family-name:var(--font-press-start)] text-[8px] text-[#F8AF3C]">
                Dark mode is here
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
