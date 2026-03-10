"use client";

import React from "react";
import type { TemplateConfig, Block, Spacing } from "@/lib/templates/config-types";
import { FORMAT_DIMENSIONS } from "@/lib/types";

type IndexedBlock = Block & { _index: number };

interface TemplatePreviewProps {
  config: TemplateConfig;
  format: "landscape" | "square" | "portrait";
  brandColors?: { background: string; text: string; primary: string };
  selectedBlockIndex?: number | null;
  onSelectBlock?: (index: number | null) => void;
}

const DEFAULT_COLORS = {
  background: "#1a1a2e",
  text: "#ffffff",
  primary: "#e94560",
};

const spacingMap: Record<Spacing, string> = {
  compact: "0.5rem",
  normal: "1rem",
  spacious: "1.5rem",
};

// ---------------------------------------------------------------------------
// Row grouping — mirrors ConfigRenderer logic
// ---------------------------------------------------------------------------

type Row =
  | { kind: "single"; block: IndexedBlock }
  | { kind: "pair"; left: IndexedBlock; right: IndexedBlock };

function groupRows(blocks: IndexedBlock[]): Row[] {
  const rows: Row[] = [];
  let i = 0;
  while (i < blocks.length) {
    const cur = blocks[i];
    const next = blocks[i + 1];
    if (cur.split === "left" && next?.split === "right") {
      rows.push({ kind: "pair", left: cur, right: next });
      i += 2;
    } else {
      rows.push({ kind: "single", block: cur });
      i += 1;
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Block placeholder renderers
// ---------------------------------------------------------------------------

const alignSelfMap = { left: "flex-start", center: "center", right: "flex-end" } as const;

type FontSizeLabel = "small" | "medium" | "large";

const titleSizes: Record<FontSizeLabel, string> = {
  large: "text-[clamp(1.1rem,3.5cqw,2.4rem)]",
  medium: "text-[clamp(0.9rem,3cqw,2rem)]",
  small: "text-[clamp(0.7rem,2.2cqw,1.4rem)]",
};

const descSizes: Record<FontSizeLabel, string> = {
  large: "text-[clamp(0.8rem,2.2cqw,1.3rem)]",
  medium: "text-[clamp(0.65rem,1.8cqw,1.1rem)]",
  small: "text-[clamp(0.5rem,1.4cqw,0.85rem)]",
};

const productNameSizes: Record<FontSizeLabel, string> = {
  large: "text-[clamp(0.85rem,2.5cqw,1.5rem)]",
  medium: "text-[clamp(0.7rem,2cqw,1.2rem)]",
  small: "text-[clamp(0.55rem,1.5cqw,0.9rem)]",
};

interface BlockProps {
  block: Block;
  textColor: string;
  gap: string;
  isLandscape: boolean;
}

/** In landscape, downscale one step to match real renderer */
function landscapeSize(size: FontSizeLabel): FontSizeLabel {
  if (size === "large") return "medium";
  if (size === "medium") return "small";
  return "small";
}

function BlockPlaceholder({ block, textColor, isLandscape }: BlockProps): React.ReactElement | null {
  const align = block.alignment ?? "left";
  const alignSelf = alignSelfMap[align];
  const textAlign = align;

  switch (block.type) {
    case "title": {
      const rawSize: FontSizeLabel = block.fontSize ?? "large";
      const size = isLandscape ? landscapeSize(rawSize) : rawSize;
      return (
        <p
          style={{ color: textColor, alignSelf, textAlign }}
          className={`${titleSizes[size]} font-bold leading-tight m-0`}
        >
          Title here
        </p>
      );
    }

    case "description": {
      const rawSize: FontSizeLabel = block.fontSize ?? "medium";
      const size = isLandscape ? landscapeSize(rawSize) : rawSize;
      return (
        <p
          style={{ color: textColor, opacity: 0.75, alignSelf, textAlign }}
          className={`${descSizes[size]} leading-snug m-0`}
        >
          Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </p>
      );
    }

    case "image": {
      const device = block.device ?? "browser";
      const imageContent = (
        <div className="w-full flex items-center justify-center bg-gray-300/80 aspect-video">
          <span className="text-[clamp(0.5rem,1.5cqw,0.85rem)] text-gray-500">
            Screenshot
          </span>
        </div>
      );

      if (device === "none") {
        return (
          <div style={{ alignSelf }} className="w-full rounded-xl overflow-hidden">
            {imageContent}
          </div>
        );
      }

      if (device === "mobile") {
        return (
          <div style={{ alignSelf: alignSelfMap[align] }} className="flex justify-center w-[45%] max-w-[45%]">
            <div className="w-full rounded-[clamp(8px,2cqw,24px)] border-[clamp(2px,0.5cqw,6px)] border-gray-800 bg-gray-800 overflow-hidden shadow-[0_16px_56px_rgba(0,0,0,0.30)]">
              <div className="w-full aspect-[9/19.5] bg-gray-300/80 flex items-center justify-center">
                <span className="text-[clamp(0.4rem,1.2cqw,0.7rem)] text-gray-500">
                  Screenshot
                </span>
              </div>
            </div>
          </div>
        );
      }

      // browser frame
      return (
        <div style={{ alignSelf: alignSelfMap[align] }} className="w-full">
          <div className="w-full rounded-lg overflow-hidden border border-gray-300 shadow-[0_12px_48px_rgba(0,0,0,0.20)]">
            {/* Browser title bar */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-200">
              <div className="flex gap-1">
                <div className="w-[clamp(4px,0.6cqw,8px)] h-[clamp(4px,0.6cqw,8px)] rounded-full bg-red-400" />
                <div className="w-[clamp(4px,0.6cqw,8px)] h-[clamp(4px,0.6cqw,8px)] rounded-full bg-yellow-400" />
                <div className="w-[clamp(4px,0.6cqw,8px)] h-[clamp(4px,0.6cqw,8px)] rounded-full bg-green-400" />
              </div>
              <div className="flex-1 mx-2 bg-white rounded-sm h-[clamp(6px,0.8cqw,12px)]" />
            </div>
            {imageContent}
          </div>
        </div>
      );
    }

    case "logo":
      return (
        <div style={{ alignSelf }} className="flex items-center gap-[0.35em]">
          <div className="rounded bg-white/20 w-[clamp(12px,2cqw,28px)] h-[clamp(12px,2cqw,28px)]" />
          <span
            style={{ color: textColor, opacity: 0.7 }}
            className="text-[clamp(0.55rem,1.4cqw,0.9rem)] font-semibold"
          >
            Product
          </span>
        </div>
      );

    case "productName": {
      const rawSize: FontSizeLabel = block.fontSize ?? "medium";
      const size = isLandscape ? landscapeSize(rawSize) : rawSize;
      return (
        <p
          style={{ color: textColor, opacity: 0.7, alignSelf }}
          className={`${productNameSizes[size]} font-bold m-0`}
        >
          Product
        </p>
      );
    }

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Selectable block wrapper
// ---------------------------------------------------------------------------

function SelectableBlock({
  block,
  textColor,
  gap,
  isLandscape,
  isSelected,
  onClick,
}: {
  block: IndexedBlock;
  textColor: string;
  gap: string;
  isLandscape: boolean;
  isSelected: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      className={`cursor-pointer rounded transition-shadow ${
        isSelected ? "ring-2 ring-blue-500" : "hover:ring-1 hover:ring-white/20"
      }`}
    >
      <BlockPlaceholder block={block} textColor={textColor} gap={gap} isLandscape={isLandscape} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TemplatePreview({
  config,
  format,
  brandColors,
  selectedBlockIndex,
  onSelectBlock,
}: TemplatePreviewProps): React.ReactElement {
  const colors = brandColors ?? DEFAULT_COLORS;
  const { width, height } = FORMAT_DIMENSIONS[format];
  const isPortrait = format === "portrait";
  const isLandscape = width > height;
  const gap = spacingMap[config.spacing] ?? spacingMap.normal;

  // Resolve background color
  const bgColor =
    config.background === "brand" ? colors.background : config.background;

  // Index blocks before grouping
  const indexedBlocks: IndexedBlock[] = config.blocks.map((b, i) => ({ ...b, _index: i }));

  // Identify fullBleed block
  const fullBleedBlock = indexedBlocks.find(
    (b) => b.type === "image" && b.display === "fullBleed"
  );
  const hasFullBleed = !!fullBleedBlock;

  // Text color: inverted when fullBleed overlay covers the bg
  const textColor = hasFullBleed ? colors.background : colors.text;

  // Flow blocks (exclude fullBleed image from normal row rendering)
  const flowBlocks = hasFullBleed
    ? indexedBlocks.filter((b) => !(b.type === "image" && b.display === "fullBleed"))
    : indexedBlocks;

  const rows = groupRows(flowBlocks);

  // Render a single row
  function renderRow(row: Row, key: number): React.ReactElement | null {
    if (row.kind === "single") {
      return (
        <SelectableBlock
          key={key}
          block={row.block}
          textColor={textColor}
          gap={gap}
          isLandscape={isLandscape}
          isSelected={selectedBlockIndex === row.block._index}
          onClick={() => onSelectBlock?.(row.block._index)}
        />
      );
    }

    // Split pair
    if (isPortrait) {
      return (
        <div
          key={key}
          className="flex flex-col w-full"
          style={{ gap }}
        >
          <SelectableBlock
            block={row.left}
            textColor={textColor}
            gap={gap}
            isLandscape={isLandscape}
            isSelected={selectedBlockIndex === row.left._index}
            onClick={() => onSelectBlock?.(row.left._index)}
          />
          <SelectableBlock
            block={row.right}
            textColor={textColor}
            gap={gap}
            isLandscape={isLandscape}
            isSelected={selectedBlockIndex === row.right._index}
            onClick={() => onSelectBlock?.(row.right._index)}
          />
        </div>
      );
    }

    return (
      <div
        key={key}
        className="flex flex-row items-center w-full"
        style={{ gap }}
      >
        <div className="flex flex-1 justify-center">
          <SelectableBlock
            block={row.left}
            textColor={textColor}
            gap={gap}
            isLandscape={isLandscape}
            isSelected={selectedBlockIndex === row.left._index}
            onClick={() => onSelectBlock?.(row.left._index)}
          />
        </div>
        <div className="flex flex-1 justify-center">
          <SelectableBlock
            block={row.right}
            textColor={textColor}
            gap={gap}
            isLandscape={isLandscape}
            isSelected={selectedBlockIndex === row.right._index}
            onClick={() => onSelectBlock?.(row.right._index)}
          />
        </div>
      </div>
    );
  }

  const renderedRows = rows
    .map((row, i) => renderRow(row, i))
    .filter(Boolean) as React.ReactElement[];

  // Shared container style using CSS aspect-ratio
  const containerStyle: React.CSSProperties = {
    aspectRatio: `${width} / ${height}`,
    backgroundColor: bgColor,
    position: "relative",
    containerType: "size",
  };

  if (hasFullBleed) {
    const fullBleedSelected = selectedBlockIndex === fullBleedBlock!._index;
    return (
      <div
        style={containerStyle}
        className="w-full overflow-hidden rounded-lg"
        onClick={() => onSelectBlock?.(null)}
      >
        {/* Gray image stand-in */}
        <div
          className="absolute inset-0"
          style={{ backgroundColor: "#555" }}
        />
        {/* Primary color overlay at 75% opacity */}
        <div
          className="absolute inset-0"
          style={{ backgroundColor: colors.primary, opacity: 0.75 }}
        />
        {/* FullBleed image selection overlay */}
        <div
          onClick={(e) => { e.stopPropagation(); onSelectBlock?.(fullBleedBlock!._index); }}
          className={`absolute inset-0 cursor-pointer transition-shadow ${
            fullBleedSelected ? "ring-2 ring-inset ring-blue-500" : "hover:ring-1 hover:ring-inset hover:ring-white/20"
          }`}
        />
        {/* Content pushed to bottom */}
        <div
          className="absolute inset-0 flex flex-col justify-end p-[5%]"
          style={{ gap }}
        >
          {renderedRows}
        </div>
      </div>
    );
  }

  return (
    <div
      style={containerStyle}
      className="w-full overflow-hidden rounded-lg flex flex-col justify-center p-[5%]"
      onClick={() => onSelectBlock?.(null)}
    >
      <div className="flex flex-col w-full" style={{ gap }}>
        {renderedRows}
      </div>
    </div>
  );
}
