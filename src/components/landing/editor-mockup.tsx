const templates = [
  { id: "standard-browser", label: "Standard Browser" },
  { id: "standard-mobile", label: "Standard Mobile" },
  { id: "split-browser", label: "Split Browser" },
  { id: "split-mobile", label: "Split Mobile" },
  { id: "hero", label: "Hero" },
];

export function EditorMockup() {
  return (
    <div aria-hidden="true">
      <div className="border-2 border-brand bg-white shadow-[4px_4px_0_var(--color-brand)]">
        {/* Top bar */}
        <div className="border-b-2 border-brand px-3 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="block h-2 w-2 border border-brand bg-gold" />
            <span className="block h-2 w-2 border border-brand bg-surface" />
            <span className="block h-2 w-2 border border-brand bg-surface" />
          </div>
          <span className="font-[family-name:var(--font-press-start)] text-[8px] text-brand/50">
            Template Library
          </span>
          <span className="font-[family-name:var(--font-press-start)] text-[7px] text-brand/30 border border-brand/20 px-1.5 py-0.5">
            + New
          </span>
        </div>

        {/* Template grid */}
        <div className="p-3 md:p-4 bg-surface/30">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="border border-brand/20 bg-white flex flex-col"
              >
                {/* Preview placeholder */}
                <div className="bg-surface/50 h-[48px] md:h-[56px] flex items-center justify-center">
                  <span className="font-[family-name:var(--font-press-start)] text-[5px] md:text-[6px] text-brand/20">
                    preview
                  </span>
                </div>
                {/* Info */}
                <div className="px-1.5 py-1.5 border-t border-brand/10 flex items-center justify-between gap-1">
                  <span className="font-[family-name:var(--font-press-start)] text-[5px] md:text-[6px] text-brand/70 truncate">
                    {tpl.label}
                  </span>
                  <span className="font-[family-name:var(--font-press-start)] text-[4px] md:text-[5px] text-brand/40 border border-brand/15 px-1 py-0.5 shrink-0">
                    Default
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
