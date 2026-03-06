import React from 'react'
import { TemplateProps } from '../types'
import { LogoBar } from './components/LogoBar'
import { TextBlock } from './components/TextBlock'
import { DeviceFrame } from './components/DeviceFrame'

export function Classic({ slide, brand, width, height, transparent }: TemplateProps) {
  const pad = 56
  const isLandscape = width > height
  const hasImage = !!slide.imageBase64

  // Text-only: center everything
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
          gap: 20,
        }}
      >
        <LogoBar brand={brand} align={slide.align ?? 'center'} />
        <TextBlock
          title={slide.title}
          description={slide.description}
          textColor={brand.colors.text}
          size="large"
          align={slide.align ?? 'center'}
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
        backgroundColor: transparent ? undefined : brand.colors.background,
        padding: pad,
        paddingBottom: 0,
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <LogoBar brand={brand} align={slide.align ?? 'center'} />
        <TextBlock
          title={slide.title}
          description={slide.description}
          textColor={brand.colors.text}
          size={isLandscape ? 'small' : 'medium'}
          align={slide.align ?? 'center'}
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
