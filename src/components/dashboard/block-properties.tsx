"use client";

import { Block, Alignment, FontSize, DeviceOption, DisplayMode, SplitSide } from "@/lib/templates/config-types";

interface BlockPropertiesProps {
  block: Block;
  onChange: (updated: Block) => void;
}

function PillButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
        active
          ? "bg-[#4A3326] text-white"
          : "bg-[#4A3326]/10 text-[#4A3326]/60 hover:bg-[#4A3326]/20"
      }`}
    >
      {label}
    </button>
  );
}

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium text-[#4A3326]/50 uppercase tracking-wide">{label}</span>
      <div className="flex gap-1">{children}</div>
    </div>
  );
}

export function BlockProperties({ block, onChange }: BlockPropertiesProps) {
  const showFontSize = block.type === "title" || block.type === "description" || block.type === "productName";
  const showDeviceFrame = block.type === "image";
  const showDisplayMode = block.type === "image";

  return (
    <div className="flex flex-col gap-4 p-3">
      <PropertyRow label="Alignment">
        {(["left", "center", "right"] as Alignment[]).map((a) => (
          <PillButton
            key={a}
            label={a.charAt(0).toUpperCase() + a.slice(1)}
            active={block.alignment === a}
            onClick={() => onChange({ ...block, alignment: a })}
          />
        ))}
      </PropertyRow>

      {showFontSize && (
        <PropertyRow label="Font Size">
          {(["small", "medium", "large"] as FontSize[]).map((s) => (
            <PillButton
              key={s}
              label={s.charAt(0).toUpperCase() + s.slice(1)}
              active={block.fontSize === s}
              onClick={() => onChange({ ...block, fontSize: s })}
            />
          ))}
        </PropertyRow>
      )}

      {showDeviceFrame && (
        <PropertyRow label="Device Frame">
          {(["browser", "mobile", "none"] as DeviceOption[]).map((d) => (
            <PillButton
              key={d}
              label={d.charAt(0).toUpperCase() + d.slice(1)}
              active={block.device === d}
              onClick={() => onChange({ ...block, device: d })}
            />
          ))}
        </PropertyRow>
      )}

      {showDisplayMode && (
        <PropertyRow label="Display Mode">
          {([["inline", "Inline"], ["fullBleed", "Full Bleed"]] as [DisplayMode, string][]).map(([val, label]) => (
            <PillButton
              key={val}
              label={label}
              active={block.display === val}
              onClick={() => onChange({ ...block, display: val })}
            />
          ))}
        </PropertyRow>
      )}

      <PropertyRow label="Split">
        <PillButton
          label="None"
          active={block.split === undefined || block.split === null}
          onClick={() => {
            const { split: _, ...rest } = block;
            onChange(rest as Block);
          }}
        />
        {(["left", "right"] as SplitSide[]).map((s) => (
          <PillButton
            key={s}
            label={s.charAt(0).toUpperCase() + s.slice(1)}
            active={block.split === s}
            onClick={() => onChange({ ...block, split: s })}
          />
        ))}
      </PropertyRow>
    </div>
  );
}
