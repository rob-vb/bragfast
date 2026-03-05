import React from 'react'
import { TemplateProps } from '../types'
import { LogoBar } from './components/LogoBar'
import { TextBlock } from './components/TextBlock'
import { BrowserFrame } from './components/BrowserFrame'

export function Classic({ slide, brand, width, height }: TemplateProps) {
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
          backgroundColor: brand.colors.background,
          padding: pad,
          justifyContent: 'center',
          alignItems: 'center',
          gap: 20,
        }}
      >
        <LogoBar brand={brand} />
        <TextBlock
          title={slide.title}
          description={slide.description}
          textColor={brand.colors.text}
          size="large"
          center
        />
      </div>
    )
  }

  // With image: text at top, browser frame pinned to bottom
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
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <LogoBar brand={brand} />
        <TextBlock
          title={slide.title}
          description={slide.description}
          textColor={brand.colors.text}
          size={isLandscape ? 'small' : 'medium'}
        />
      </div>
      <BrowserFrame
        imageBase64={slide.imageBase64!}
        primaryColor={brand.colors.primary}
        width={frameWidth}
        maxHeight={Math.round(height * (isLandscape ? 0.55 : 0.62))}
      />
    </div>
  )
}
