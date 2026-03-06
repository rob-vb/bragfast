import React from 'react'
import { TemplateProps } from '../types'
import { LogoBar } from './components/LogoBar'
import { TextBlock } from './components/TextBlock'
import { DeviceFrame } from './components/DeviceFrame'

export function Split({ slide, brand, width, height, transparent }: TemplateProps) {
  const pad = 56
  const isLandscape = width > height
  const hasImage = !!slide.imageBase64

  // Text-only: centered
  if (!hasImage) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width,
          height,
          ...(transparent ? {} : { backgroundColor: brand.colors.background }),
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
          align={slide.align ?? 'left'}
        />
        <LogoBar brand={brand} align={slide.align ?? 'left'} />
      </div>
    )
  }

  if (isLandscape) {
    // Side-by-side: left text, right image (50/50)
    const halfWidth = Math.round((width - pad * 2) / 2)

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          width,
          height,
          ...(transparent ? {} : { backgroundColor: brand.colors.background }),
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
          <LogoBar brand={brand} align={slide.align ?? 'left'} />
          <TextBlock
            title={slide.title}
            description={slide.description}
            textColor={brand.colors.text}
            size="medium"
            align={slide.align ?? 'left'}
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

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width,
        height,
        backgroundColor: brand.colors.background,
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
          align={slide.align ?? 'left'}
        />
        <LogoBar brand={brand} align={slide.align ?? 'left'} />
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
