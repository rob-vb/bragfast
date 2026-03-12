"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { LandingNav } from "@/components/landing/landing-nav";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TEMPLATES = [
  { value: "classic", label: "Classic" },
  { value: "split", label: "Split" },
  { value: "hero", label: "Hero" },
];

const UPDATE_TYPES = [
  { value: "website", label: "Website redesign" },
  { value: "mobile", label: "Mobile app" },
  { value: "bugs", label: "Bug fixes" },
];

const FONTS = [
  { value: "inter", label: "Inter" },
  { value: "raleway", label: "Raleway" },
  { value: "saira", label: "Saira" },
];

const FORMATS = ["landscape", "square", "portrait"] as const;

const FORMAT_LABELS: Record<string, string> = {
  landscape: "1200 x 675",
  square: "1080 x 1080",
  portrait: "1080 x 1920",
};

// Map internal font value to API font_family value
const FONT_FAMILY_MAP: Record<string, string> = {
  inter: "Inter",
  raleway: "Raleway",
  saira: "Saira",
};

// Slide objects per update type for the curl snippet
const SLIDE_OBJECTS: Record<string, string> = {
  website: `{ "id": "title", "text": "Fresh new look" },
        { "id": "description", "text": "We redesigned our website from the ground up" },
        { "id": "image", "image_url": "https://..." }`,
  mobile: `{ "id": "title", "text": "Now on mobile" },
        { "id": "description", "text": "Take it anywhere with our brand new mobile app" },
        { "id": "image", "image_url": "https://..." }`,
  bugs: `{ "id": "title", "text": "Squashed 12 bugs" },
        { "id": "description", "text": "Stability and performance improvements across the board" }`,
};

function imagePath(template: string, type: string, font: string, format: string) {
  return `/demo/${template}-${type}-${font}-${format}.jpg`;
}

const PROGRESS_DURATION = 2400; // total fake generation time in ms
const PROGRESS_INTERVAL = 30; // update tick

export default function DemoPage() {
  const [template, setTemplate] = useState("classic");
  const [updateType, setUpdateType] = useState("website");
  const [font, setFont] = useState("inter");
  const [generated, setGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const generate = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setLoading(true);
    setGenerated(false);
    setProgress(0);

    const start = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(elapsed / PROGRESS_DURATION, 1);
      // Ease-out curve: fast start, slows toward the end
      const eased = 1 - Math.pow(1 - pct, 3);
      setProgress(eased * 100);

      if (pct >= 1) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setProgress(100);
        setGenerated(true);
        setLoading(false);
      }
    }, PROGRESS_INTERVAL);
  }, []);

  const curlSnippet = `curl -X POST bragfast.com/api/v1/release \\
  -H "Authorization: Bearer bf_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "template": "${template}",
    "font_family": "${FONT_FAMILY_MAP[font]}",
    "slides": [{
      "objects": [
        ${SLIDE_OBJECTS[updateType]}
      ]
    }],
    "formats": ["landscape", "square", "portrait"]
  }'`;

  return (
    <div className="min-h-screen bg-surface text-brand">
      <LandingNav />

      <section className="py-12 md:py-20">
        <div className="mx-auto max-w-5xl px-4 md:px-8">
          {/* Header */}
          <div className="text-center mb-10 md:mb-14">
            <h1 className="font-[family-name:var(--font-press-start)] text-lg md:text-2xl leading-relaxed mb-4">
              See the kitchen in action
            </h1>
            <p className="font-[family-name:var(--font-geist-sans)] text-base md:text-lg text-brand/70 max-w-2xl mx-auto leading-relaxed">
              Pick a template, tweak the ingredients. Three formats, zero signup.
            </p>
          </div>

          {/* Controls */}
          <div className="border-2 border-brand bg-white p-4 md:p-6 shadow-[4px_4px_0_var(--color-brand)] mb-8 md:mb-10">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
              {/* Template */}
              <div className="flex-1">
                <label className="block font-[family-name:var(--font-press-start)] text-[9px] mb-2 text-brand/60">
                  Template
                </label>
                <Select value={template} onValueChange={setTemplate}>
                  <SelectTrigger className="w-full border-2 border-brand bg-surface rounded-none shadow-[2px_2px_0_var(--color-brand)] font-[family-name:var(--font-geist-sans)] text-sm h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-2 border-brand rounded-none bg-surface shadow-[3px_3px_0_var(--color-brand)]">
                    {TEMPLATES.map((t) => (
                      <SelectItem
                        key={t.value}
                        value={t.value}
                        className="font-[family-name:var(--font-geist-sans)] text-sm rounded-none focus:bg-gold/30"
                      >
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Update Type */}
              <div className="flex-1">
                <label className="block font-[family-name:var(--font-press-start)] text-[9px] mb-2 text-brand/60">
                  Type of update
                </label>
                <Select value={updateType} onValueChange={setUpdateType}>
                  <SelectTrigger className="w-full border-2 border-brand bg-surface rounded-none shadow-[2px_2px_0_var(--color-brand)] font-[family-name:var(--font-geist-sans)] text-sm h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-2 border-brand rounded-none bg-surface shadow-[3px_3px_0_var(--color-brand)]">
                    {UPDATE_TYPES.map((t) => (
                      <SelectItem
                        key={t.value}
                        value={t.value}
                        className="font-[family-name:var(--font-geist-sans)] text-sm rounded-none focus:bg-gold/30"
                      >
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Font */}
              <div className="flex-1">
                <label className="block font-[family-name:var(--font-press-start)] text-[9px] mb-2 text-brand/60">
                  Font
                </label>
                <Select value={font} onValueChange={setFont}>
                  <SelectTrigger className="w-full border-2 border-brand bg-surface rounded-none shadow-[2px_2px_0_var(--color-brand)] font-[family-name:var(--font-geist-sans)] text-sm h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-2 border-brand rounded-none bg-surface shadow-[3px_3px_0_var(--color-brand)]">
                    {FONTS.map((f) => (
                      <SelectItem
                        key={f.value}
                        value={f.value}
                        className="font-[family-name:var(--font-geist-sans)] text-sm rounded-none focus:bg-gold/30"
                      >
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Generate */}
              <button
                onClick={generate}
                className="font-[family-name:var(--font-press-start)] text-[10px] px-6 py-3 h-10 text-brand border-2 border-brand bg-gold shadow-[3px_3px_0_var(--color-brand)] hover:shadow-[1px_1px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all whitespace-nowrap"
              >
                Generate
              </button>
            </div>
          </div>

          {/* Progress bar */}
          {loading && (
            <div className="mb-6 md:mb-8">
              <div className="border-2 border-brand bg-white h-6 shadow-[2px_2px_0_var(--color-brand)] overflow-hidden">
                <div
                  className="h-full bg-gold transition-[width] duration-75 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="font-[family-name:var(--font-press-start)] text-[8px] text-brand/40 mt-2 text-center">
                cooking... {Math.round(progress)}%
              </p>
            </div>
          )}

          {/* Image Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-10 md:mb-14">
            {FORMATS.map((format) => (
              <div key={format} className="border-2 border-brand bg-white shadow-[3px_3px_0_var(--color-brand)]">
                {/* Format label bar */}
                <div className="border-b-2 border-brand px-3 py-1.5 flex items-center justify-between">
                  <span className="font-[family-name:var(--font-press-start)] text-[8px] text-brand/60">
                    {format}
                  </span>
                  <span className="font-[family-name:var(--font-geist-mono)] text-[10px] text-brand/40">
                    {FORMAT_LABELS[format]}
                  </span>
                </div>

                {/* Image area */}
                <div className="relative bg-surface/50">
                  {generated ? (
                    <Image
                      src={imagePath(template, updateType, font, format)}
                      alt={`${template} ${updateType} ${font} — ${format}`}
                      width={format === "landscape" ? 1200 : 1080}
                      height={
                        format === "landscape"
                          ? 675
                          : format === "square"
                            ? 1080
                            : 1920
                      }
                      className="w-full h-auto"
                      unoptimized
                    />
                  ) : (
                    <div
                      className={`flex items-center justify-center ${
                        format === "landscape"
                          ? "aspect-[1200/675]"
                          : format === "square"
                            ? "aspect-square"
                            : "aspect-[1080/1920]"
                      }`}
                    >
                      <span className="font-[family-name:var(--font-press-start)] text-[8px] text-brand/20">
                        [ {format} ]
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Curl snippet */}
          <div className="border-2 border-brand bg-brand shadow-[4px_4px_0_var(--color-brand)]">
            <div className="border-b-2 border-surface/20 px-3 py-1.5 flex items-center gap-1.5">
              <span className="block h-2 w-2 border border-surface/30 bg-gold" />
              <span className="block h-2 w-2 border border-surface/30 bg-surface/20" />
              <span className="block h-2 w-2 border border-surface/30 bg-surface/20" />
              <span className="font-[family-name:var(--font-press-start)] text-[7px] text-surface/40 ml-2">
                equivalent API call
              </span>
            </div>
            <pre className="p-4 md:p-6 overflow-x-auto">
              <code className="font-[family-name:var(--font-geist-mono)] text-xs md:text-sm text-surface/90 leading-relaxed whitespace-pre">
                {curlSnippet}
              </code>
            </pre>
          </div>

          {/* CTA */}
          <div className="text-center mt-10 md:mt-14">
            <p className="font-[family-name:var(--font-geist-sans)] text-sm text-brand/60 mb-4">
              Ready to cook your own?
            </p>
            <a
              href="/signup"
              className="inline-block font-[family-name:var(--font-press-start)] text-[10px] md:text-xs px-6 py-4 text-brand border-2 border-brand bg-gold shadow-[4px_4px_0_var(--color-brand)] hover:shadow-[2px_2px_0_var(--color-brand)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
            >
              Get 30 Free Credits
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
