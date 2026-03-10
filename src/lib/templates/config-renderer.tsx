import React from 'react'
import type { TemplateProps, Brand } from '../types'
import type { TemplateConfig, Block } from './config-types'
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

const alignItemsMap = { left: 'flex-start', center: 'center', right: 'flex-end' } as const

function hasFullBleedImage(blocks: Block[]): boolean {
  return blocks.some((b) => b.type === 'image' && b.display === 'fullBleed')
}

function hasSplitBlocks(blocks: Block[]): boolean {
  return blocks.some((b) => b.split)
}

// ---------------------------------------------------------------------------
// Full-bleed (Hero) renderer
// ---------------------------------------------------------------------------

function renderFullBleed(props: ConfigRendererProps): React.ReactElement {
  const { config, slide, brand, width, height, transparent } = props
  const pad = 56
  const isLandscape = width > height
  const hasImage = !!slide.imageBase64
  const textColor = brand.colors.background
  const blocks = config.blocks

  // Determine alignment from the first title/description block, default center
  const textBlock = blocks.find((b) => b.type === 'title' || b.type === 'description')
  const align = textBlock?.alignment ?? (slide.align ?? 'center')
  const alignItems = alignItemsMap[align]

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
      {/* Full-bleed background image */}
      {hasImage && (
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
          opacity: hasImage ? 0.75 : 1,
        }}
      />

      {/* Content layer */}
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
          gap: 24,
        }}
      >
        {/* Text block — inline styles matching Hero exactly */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            maxWidth: isLandscape ? '65%' : '100%',
            alignItems,
            textAlign: align,
          }}
        >
          {blocks
            .filter((b) => b.type === 'title' || b.type === 'description')
            .map((block, i) => {
              if (block.type === 'title') {
                return (
                  <span
                    key={i}
                    style={{
                      fontSize: isLandscape ? 64 : 56,
                      fontWeight: 700,
                      color: textColor,
                      lineHeight: 1.1,
                      fontFamily: 'Plus Jakarta Sans',
                    }}
                  >
                    {slide.title}
                  </span>
                )
              }
              if (block.type === 'description' && slide.description) {
                return (
                  <span
                    key={i}
                    style={{
                      fontSize: isLandscape ? 26 : 22,
                      fontWeight: 400,
                      color: textColor,
                      opacity: 0.85,
                      lineHeight: 1.4,
                      fontFamily: 'Plus Jakarta Sans',
                    }}
                  >
                    {slide.description}
                  </span>
                )
              }
              return null
            })}
        </div>

        {/* Logo row — below text, separated */}
        {blocks.some((b) => b.type === 'logo') && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              alignSelf: alignItems,
            }}
          >
            <img
              src={brand.logoBase64}
              width={40}
              height={40}
              style={{ display: 'flex', borderRadius: 8 }}
            />
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: textColor,
                opacity: 0.7,
                fontFamily: 'Plus Jakarta Sans',
              }}
            >
              {brand.name}
            </span>
          </div>
        )}

        {/* Product name block (for hero, renders like logo row without the image) */}
        {blocks.some((b) => b.type === 'productName') && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              alignSelf: alignItems,
            }}
          >
            <span
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: textColor,
                opacity: 0.7,
                fontFamily: 'Plus Jakarta Sans',
              }}
            >
              {brand.name}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Split renderer (landscape: side-by-side, portrait/square: stacked)
// ---------------------------------------------------------------------------

function renderSplit(props: ConfigRendererProps): React.ReactElement {
  const { config, slide, brand, width, height, transparent } = props
  const pad = 56
  const isLandscape = width > height
  const hasImage = !!slide.imageBase64
  const blocks = config.blocks

  // Text-only: centered
  if (!hasImage) {
    const align = slide.align ?? 'left'
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width,
          height,
          ...(transparent ? {} : { backgroundColor: resolveBackground(config, brand) }),
          padding: pad,
          justifyContent: 'center',
          gap: 24,
        }}
      >
        <TextBlock
          title={slide.title}
          description={slide.description}
          textColor={brand.colors.text}
          size="large"
          align={align}
        />
        <LogoBar brand={brand} align={align} />
      </div>
    )
  }

  if (isLandscape) {
    // Side-by-side: left text, right image (50/50)
    const halfWidth = Math.round((width - pad * 2) / 2)
    const align = slide.align ?? 'left'

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          width,
          height,
          ...(transparent ? {} : { backgroundColor: resolveBackground(config, brand) }),
          padding: pad,
          alignItems: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: halfWidth,
            justifyContent: 'center',
            gap: 20,
          }}
        >
          <LogoBar brand={brand} align={align} />
          <TextBlock
            title={slide.title}
            description={slide.description}
            textColor={brand.colors.text}
            size="medium"
            align={align}
          />
        </div>
        <div
          style={{
            display: 'flex',
            width: halfWidth,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <DeviceFrame
            device={slide.device}
            imageBase64={slide.imageBase64!}
            primaryColor={brand.colors.primary}
            width={halfWidth}
            maxHeight={height - pad * 2 - 48}
            canvasWidth={width}
            canvasHeight={height}
          />
        </div>
      </div>
    )
  }

  // Square / Portrait: centered text, frame flush to bottom
  const frameWidth = width - pad * 2
  const align = slide.align ?? 'left'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width,
        height,
        backgroundColor: resolveBackground(config, brand),
        padding: pad,
        paddingBottom: 0,
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: Math.round(pad * 0.75),
          gap: 16,
        }}
      >
        <TextBlock
          title={slide.title}
          description={slide.description}
          textColor={brand.colors.text}
          size="medium"
          align={align}
        />
        <LogoBar brand={brand} align={align} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>
        <DeviceFrame
          device={slide.device}
          imageBase64={slide.imageBase64!}
          primaryColor={brand.colors.primary}
          width={frameWidth}
          maxHeight={Math.round(height * 0.58)}
          flush
          canvasWidth={width}
          canvasHeight={height}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Classic renderer (default flow: text top, image bottom)
// ---------------------------------------------------------------------------

function renderClassic(props: ConfigRendererProps): React.ReactElement {
  const { config, slide, brand, width, height, transparent } = props
  const pad = 56
  const isLandscape = width > height
  const hasImage = !!slide.imageBase64
  const align = slide.align ?? 'center'

  // Text-only: center everything
  if (!hasImage) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width,
          height,
          ...(transparent ? {} : { backgroundColor: resolveBackground(config, brand) }),
          padding: pad,
          justifyContent: 'center',
          gap: 20,
        }}
      >
        <LogoBar brand={brand} align={align} />
        <TextBlock
          title={slide.title}
          description={slide.description}
          textColor={brand.colors.text}
          size="large"
          align={align}
        />
      </div>
    )
  }

  // With image: text at top, browser frame flush to bottom
  const frameWidth = width - pad * 2

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width,
        height,
        backgroundColor: transparent ? undefined : resolveBackground(config, brand),
        padding: pad,
        paddingBottom: 0,
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <LogoBar brand={brand} align={align} />
        <TextBlock
          title={slide.title}
          description={slide.description}
          textColor={brand.colors.text}
          size={isLandscape ? 'small' : 'medium'}
          align={align}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', paddingTop: slide.device === 'mobile' && isLandscape ? 48 : 0 }}>
        <DeviceFrame
          device={slide.device}
          imageBase64={slide.imageBase64!}
          primaryColor={brand.colors.primary}
          width={frameWidth}
          maxHeight={Math.round(height * (isLandscape ? 0.55 : 0.68))}
          flush
          canvasWidth={width}
          canvasHeight={height}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main ConfigRenderer — dispatches based on config shape
// ---------------------------------------------------------------------------

export function ConfigRenderer(props: ConfigRendererProps): React.ReactElement {
  const { config } = props

  // Detect layout strategy from the config blocks
  if (hasFullBleedImage(config.blocks)) {
    return renderFullBleed(props)
  }

  if (hasSplitBlocks(config.blocks)) {
    return renderSplit(props)
  }

  return renderClassic(props)
}
