import React from 'react'
import type { TemplateProps, Brand } from '../types'
import type { TemplateConfig, Block, Spacing } from './config-types'
import { LogoBar } from './components/LogoBar'
import { TextBlock } from './components/TextBlock'
import { DeviceFrame } from './components/DeviceFrame'

export interface ConfigRendererProps extends TemplateProps {
  config: TemplateConfig
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveBackground(
  config: TemplateConfig,
  brand: Brand,
  transparent?: boolean,
): string | undefined {
  if (transparent) return undefined
  if (config.background === 'brand') return brand.colors.background
  return config.background
}

const spacingGap: Record<Spacing, number> = {
  compact: 12,
  normal: 20,
  spacious: 32,
}

const alignItemsMap = { left: 'flex-start', center: 'center', right: 'flex-end' } as const

type FontSizeLabel = 'small' | 'medium' | 'large'

/** In landscape, downscale one step: large→medium, medium→small, small stays small */
function landscapeSize(size: FontSizeLabel): FontSizeLabel {
  if (size === 'large') return 'medium'
  if (size === 'medium') return 'small'
  return 'small'
}

// ---------------------------------------------------------------------------
// Row grouping: pair consecutive left+right splits, else single full-width
// ---------------------------------------------------------------------------

type Row = { kind: 'single'; block: Block } | { kind: 'pair'; left: Block; right: Block }

function groupRows(blocks: Block[]): Row[] {
  const rows: Row[] = []
  let i = 0
  while (i < blocks.length) {
    const cur = blocks[i]
    const next = blocks[i + 1]
    if (cur.split === 'left' && next?.split === 'right') {
      rows.push({ kind: 'pair', left: cur, right: next })
      i += 2
    } else {
      rows.push({ kind: 'single', block: cur })
      i += 1
    }
  }
  return rows
}

// ---------------------------------------------------------------------------
// renderBlock — universal block renderer
// ---------------------------------------------------------------------------

interface BlockContext {
  slide: ConfigRendererProps['slide']
  brand: Brand
  width: number
  height: number
  isLandscape: boolean
  gap: number
  textColor: string
}

function renderBlock(block: Block, ctx: BlockContext, key: number): React.ReactElement | null {
  const { slide, brand, width, height, isLandscape } = ctx
  const align = block.alignment ?? 'left'

  switch (block.type) {
    case 'title': {
      const rawSize: FontSizeLabel = block.fontSize ?? 'large'
      const size = isLandscape ? landscapeSize(rawSize) : rawSize
      return (
        <TextBlock
          key={key}
          title={slide.title}
          textColor={ctx.textColor}
          size={size}
          align={align}
        />
      )
    }

    case 'description': {
      if (!slide.description) return null
      const rawSize: FontSizeLabel = block.fontSize ?? 'medium'
      const size = isLandscape ? landscapeSize(rawSize) : rawSize
      return (
        <TextBlock
          key={key}
          title={slide.description}
          textColor={ctx.textColor}
          size={size}
          align={align}
        />
      )
    }

    case 'image': {
      if (!slide.imageBase64) return null
      const device = block.device ?? 'browser'
      if (device === 'none') {
        return (
          <img
            key={key}
            src={slide.imageBase64}
            style={{
              display: 'flex',
              maxWidth: '100%',
              objectFit: 'contain',
              alignSelf: alignItemsMap[align],
              borderRadius: 12,
            }}
          />
        )
      }
      // DeviceFrame accepts 'browser' | 'mobile'
      const frameWidth = Math.round(width * 0.85)
      return (
        <div key={key} style={{ display: 'flex', justifyContent: alignItemsMap[align], alignItems: 'center' }}>
          <DeviceFrame
            device={device}
            imageBase64={slide.imageBase64}
            primaryColor={brand.colors.primary}
            width={frameWidth}
            maxHeight={Math.round(height * (isLandscape ? 0.55 : 0.68))}
            canvasWidth={width}
            canvasHeight={height}
          />
        </div>
      )
    }

    case 'logo': {
      return (
        <div key={key} style={{ display: 'flex', alignSelf: alignItemsMap[align] }}>
          <LogoBar brand={brand} align={align} />
        </div>
      )
    }

    case 'productName': {
      const rawSize: FontSizeLabel = block.fontSize ?? 'medium'
      const size = isLandscape ? landscapeSize(rawSize) : rawSize
      const fontSizes = { large: 32, medium: 24, small: 18 }
      return (
        <span
          key={key}
          style={{
            display: 'flex',
            fontSize: fontSizes[size],
            fontWeight: 700,
            color: ctx.textColor,
            opacity: 0.7,
            fontFamily: 'Plus Jakarta Sans',
            alignSelf: alignItemsMap[align],
          }}
        >
          {brand.name}
        </span>
      )
    }

    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Main ConfigRenderer — universal block iterator
// ---------------------------------------------------------------------------

export function ConfigRenderer(props: ConfigRendererProps): React.ReactElement {
  const { config, slide, brand, width, height, transparent } = props
  const pad = 56
  const isLandscape = width > height
  const isPortrait = height > width
  const gap = spacingGap[config.spacing] ?? spacingGap.normal

  // 1. Check for fullBleed image block
  const fullBleedBlock = config.blocks.find((b) => b.type === 'image' && b.display === 'fullBleed')
  const hasFullBleed = !!fullBleedBlock
  const hasFullBleedImage = hasFullBleed && !!slide.imageBase64

  // For fullBleed, text renders on the overlay → use background color for contrast
  const textColor = hasFullBleed ? brand.colors.background : brand.colors.text

  // 2. Filter out the fullBleed block from normal flow
  const flowBlocks = hasFullBleed
    ? config.blocks.filter((b) => !(b.type === 'image' && b.display === 'fullBleed'))
    : config.blocks

  // 3. Group remaining blocks into rows
  const rows = groupRows(flowBlocks)

  const ctx: BlockContext = {
    slide,
    brand,
    width,
    height,
    isLandscape,
    gap,
    textColor,
  }

  // 4. Render
  if (hasFullBleed) {
    // Full-bleed layout: absolute background image + overlay + content at flex-end
    return (
      <div
        style={{
          display: 'flex',
          position: 'relative',
          width,
          height,
          ...(transparent ? {} : { backgroundColor: brand.colors.primary }),
        }}
      >
        {/* Background image */}
        {hasFullBleedImage && (
          <img
            src={slide.imageBase64!}
            width={width}
            height={height}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${width}px`,
              height: `${height}px`,
              objectFit: 'cover',
            }}
          />
        )}

        {/* Color overlay */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${width}px`,
            height: `${height}px`,
            backgroundColor: brand.colors.primary,
            opacity: hasFullBleedImage ? 0.75 : 1,
          }}
        />

        {/* Content layer — flex-end to push content to bottom */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${width}px`,
            height: `${height}px`,
            padding: pad,
            flexDirection: 'column',
            justifyContent: 'flex-end',
            gap,
          }}
        >
          {renderRows(rows, ctx, isPortrait)}
        </div>
      </div>
    )
  }

  // Standard layout: normal block flow
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width,
        height,
        ...(transparent ? {} : { backgroundColor: resolveBackground(config, brand, transparent) }),
        padding: pad,
        justifyContent: 'center',
        gap,
      }}
    >
      {renderRows(rows, ctx, isPortrait)}
    </div>
  )
}

// ---------------------------------------------------------------------------
// renderRows — renders grouped rows
// ---------------------------------------------------------------------------

function renderRows(rows: Row[], ctx: BlockContext, isPortrait: boolean): React.ReactElement[] {
  const elements: React.ReactElement[] = []
  let key = 0

  for (const row of rows) {
    if (row.kind === 'single') {
      const el = renderBlock(row.block, ctx, key++)
      if (el) elements.push(el)
    } else {
      // Split pair
      if (isPortrait) {
        // Portrait: collapse to vertical, left on top, right below
        const leftEl = renderBlock(row.left, ctx, key++)
        const rightEl = renderBlock(row.right, ctx, key++)
        elements.push(
          <div key={`pair-${key}`} style={{ display: 'flex', flexDirection: 'column', gap: ctx.gap }}>
            {leftEl}
            {rightEl}
          </div>,
        )
      } else {
        // Landscape/square: side-by-side 50/50
        const halfWidth = Math.round((ctx.width - 56 * 2) / 2)
        const splitCtx = { ...ctx, width: halfWidth }
        const leftEl = renderBlock(row.left, splitCtx, key++)
        const rightEl = renderBlock(row.right, splitCtx, key++)
        elements.push(
          <div
            key={`pair-${key}`}
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: ctx.gap,
            }}
          >
            <div style={{ display: 'flex', flex: 1, justifyContent: 'center' }}>{leftEl}</div>
            <div style={{ display: 'flex', flex: 1, justifyContent: 'center' }}>{rightEl}</div>
          </div>,
        )
      }
    }
  }

  return elements
}
