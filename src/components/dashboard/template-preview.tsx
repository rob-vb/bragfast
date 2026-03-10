"use client";

import React from "react";
import type { TemplateConfig, Block, Spacing } from "@/lib/templates/config-types";
import { FORMAT_DIMENSIONS } from "@/lib/types";

interface TemplatePreviewProps {
  config: TemplateConfig;
  format: "landscape" | "square" | "portrait";
  brandColors?: { background: string; text: string; primary: string };
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
  | { kind: "single"; block: Block }
  | { kind: "pair"; left: Block; right: Block };

function groupRows(blocks: Block[]): Row[] {
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

interface BlockProps {
  block: Block;
  textColor: string;
  gap: string;
}

function BlockPlaceholder({ block, textColor }: BlockProps): React.ReactElement | null {
  switch (block.type) {
    case "title":
      return (
        <p
          style={{ color: textColor }}
          className="text-[clamp(0.9rem,3cqw,2rem)] font-bold leading-tight m-0"
        >
          Title here
        </p>
      );

    case "description":
      return (
        <p
          style={{ color: textColor, opacity: 0.75 }}
          className="text-[clamp(0.65rem,1.8cqw,1.1rem)] leading-snug m-0"
        >
          Lorem ipsum dolor sit amet, consectetur adipiscing elit.
        </p>
      );

    case "image":
      return (
        <div className="w-full flex items-center justify-center rounded-lg overflow-hidden bg-white/10 aspect-video">
          <span
            style={{ color: textColor, opacity: 0.5 }}
            className="text-[clamp(0.5rem,1.5cqw,0.85rem)]"
          >
            Screenshot
          </span>
        </div>
      );

    case "logo":
      return (
        <div className="flex items-center gap-[0.35em]">
          <div className="rounded bg-white/20 w-[clamp(12px,2cqw,28px)] h-[clamp(12px,2cqw,28px)]" />
          <span
            style={{ color: textColor, opacity: 0.7 }}
            className="text-[clamp(0.55rem,1.4cqw,0.9rem)] font-semibold"
          >
            Product
          </span>
        </div>
      );

    case "productName":
      return (
        <p
          style={{ color: textColor, opacity: 0.7 }}
          className="text-[clamp(0.7rem,2cqw,1.2rem)] font-bold m-0"
        >
          Product
        </p>
      );

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function TemplatePreview({
  config,
  format,
  brandColors,
}: TemplatePreviewProps): React.ReactElement {
  const colors = brandColors ?? DEFAULT_COLORS;
  const { width, height } = FORMAT_DIMENSIONS[format];
  const isPortrait = format === "portrait";
  const gap = spacingMap[config.spacing] ?? spacingMap.normal;

  // Resolve background color
  const bgColor =
    config.background === "brand" ? colors.background : config.background;

  // Identify fullBleed block
  const fullBleedBlock = config.blocks.find(
    (b) => b.type === "image" && b.display === "fullBleed"
  );
  const hasFullBleed = !!fullBleedBlock;

  // Text color: inverted when fullBleed overlay covers the bg
  const textColor = hasFullBleed ? colors.background : colors.text;

  // Flow blocks (exclude fullBleed image from normal row rendering)
  const flowBlocks = hasFullBleed
    ? config.blocks.filter((b) => !(b.type === "image" && b.display === "fullBleed"))
    : config.blocks;

  const rows = groupRows(flowBlocks);

  // Render a single row
  function renderRow(row: Row, key: number): React.ReactElement | null {
    const blockProps = { textColor, gap };

    if (row.kind === "single") {
      const el = (
        <BlockPlaceholder key={key} block={row.block} {...blockProps} />
      );
      return el;
    }

    // Split pair
    if (isPortrait) {
      return (
        <div
          key={key}
          className="flex flex-col w-full"
          style={{ gap }}
        >
          <BlockPlaceholder block={row.left} {...blockProps} />
          <BlockPlaceholder block={row.right} {...blockProps} />
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
          <BlockPlaceholder block={row.left} {...blockProps} />
        </div>
        <div className="flex flex-1 justify-center">
          <BlockPlaceholder block={row.right} {...blockProps} />
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
    return (
      <div style={containerStyle} className="w-full overflow-hidden rounded-lg">
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
    >
      <div className="flex flex-col w-full" style={{ gap }}>
        {renderedRows}
      </div>
    </div>
  );
}
