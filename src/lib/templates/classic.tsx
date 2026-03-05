import React from 'react'
import { TemplateProps } from '../types'
import { LogoBar } from './components/LogoBar'
import { TextBlock } from './components/TextBlock'
import { BrowserFrame } from './components/BrowserFrame'

export function Classic({ slide, brand, width, height }: TemplateProps) {
  const pad = 48
  const isLandscape = width > height
  const isPortrait = width < height
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
          gap: 24,
        }}
      >
        <LogoBar brand={brand} />
        <TextBlock
          title={slide.title}
          description={slide.description}
          textColor={brand.colors.text}
          size="large"
        />
      </div>
    )
  }

  const frameWidth = isLandscape ? width - pad * 2 : width - pad * 2

  if (isLandscape) {
    // Landscape: logo top-left, text below, browser frame at bottom (~55%)
    const frameHeight = Math.round(height * 0.55)
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <LogoBar brand={brand} />
          <TextBlock
            title={slide.title}
            description={slide.description}
            textColor={brand.colors.text}
            size="small"
          />
        </div>
        <BrowserFrame
          imageBase64={slide.imageBase64!}
          primaryColor={brand.colors.primary}
          width={frameWidth}
        />
      </div>
    )
  }

  // Square or Portrait: logo top, text, then browser frame fills remaining
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width,
        height,
        backgroundColor: brand.colors.background,
        padding: pad,
        gap: 24,
      }}
    >
      <LogoBar brand={brand} />
      <TextBlock
        title={slide.title}
        description={slide.description}
        textColor={brand.colors.text}
        size={isPortrait ? 'medium' : 'medium'}
      />
      <div style={{ display: 'flex', flex: 1 }}>
        <BrowserFrame
          imageBase64={slide.imageBase64!}
          primaryColor={brand.colors.primary}
          width={frameWidth}
        />
      </div>
    </div>
  )
}
