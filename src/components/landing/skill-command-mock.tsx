export function SkillCommandMock() {
  return (
    <div className="border-2 border-brand bg-brand shadow-[4px_4px_0_var(--color-brand)]">
      <div className="border-b-2 border-surface/20 px-3 py-1.5 flex items-center gap-1.5">
        <span className="block h-2 w-2 border border-surface/30 bg-gold" />
        <span className="block h-2 w-2 border border-surface/30 bg-surface/20" />
        <span className="block h-2 w-2 border border-surface/30 bg-surface/20" />
      </div>
      <pre className="p-4 overflow-x-auto">
        <code className="font-[family-name:var(--font-geist-mono)] text-xs md:text-sm text-surface/90 leading-relaxed">
{`> /bragfast
  Generate release images for "Dark mode is here"
  --template standard-browser

  Generating 3 formats...
  landscape  1200×675   ✓ 182 KB
  square     1080×1080  ✓ 156 KB
  portrait   1080×1350  ✓ 201 KB`}
        </code>
      </pre>
      <div className="flex items-center gap-2 px-4 pb-3 pt-1">
        <span className="font-[family-name:var(--font-geist-mono)] text-[8px] text-surface/40">
          Output:
        </span>
        {["16:9", "1:1", "4:5"].map((fmt) => (
          <span
            key={fmt}
            className="font-[family-name:var(--font-press-start)] text-[6px] text-surface/60 border border-surface/20 px-1.5 py-0.5"
          >
            {fmt}
          </span>
        ))}
      </div>
    </div>
  );
}
