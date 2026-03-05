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
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
            maxWidth: isLandscape ? '70%' : '85%',
            alignItems: 'center',
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
      </div>
    )
  }

  const frameWidth = width - pad * 2

  if (isLandscape) {
    // Landscape: logo + text top, browser frame bottom with constrained height
    const frameMaxHeight = Math.round(height * 0.52)
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
          maxHeight={frameMaxHeight}
        />
      </div>
    )
  }

  // Square or Portrait: logo top, text, then browser frame with constrained height
  const frameMaxHeight = Math.round(height * 0.58)

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
        size="medium"
      />
      <BrowserFrame
        imageBase64={slide.imageBase64!}
        primaryColor={brand.colors.primary}
        width={frameWidth}
        maxHeight={frameMaxHeight}
      />
    </div>
  )
}
