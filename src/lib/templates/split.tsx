import React from 'react'
import { TemplateProps } from '../types'
import { LogoBar } from './components/LogoBar'
import { TextBlock } from './components/TextBlock'
import { BrowserFrame } from './components/BrowserFrame'

export function Split({ slide, brand, width, height }: TemplateProps) {
  const pad = 56
  const isLandscape = width > height
  const hasImage = !!slide.imageBase64

  // Text-only: centered with accent line
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
            gap: 24,
            maxWidth: isLandscape ? '70%' : '85%',
            alignItems: 'center',
          }}
        >
          {/* Accent bar to differentiate from Classic */}
          <div
            style={{
              display: 'flex',
              width: 48,
              height: 4,
              backgroundColor: brand.colors.primary,
              borderRadius: 2,
            }}
          />
          <TextBlock
            title={slide.title}
            description={slide.description}
            textColor={brand.colors.text}
            size="large"
          />
          <LogoBar brand={brand} />
        </div>
      </div>
    )
  }

  if (isLandscape) {
    // Side-by-side: left text (~40%), right image (~55%)
    const leftWidth = Math.round(width * 0.38)
    const rightWidth = Math.round(width * 0.52)
    const frameMaxHeight = height - pad * 2

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          width,
          height,
          backgroundColor: brand.colors.background,
          padding: pad,
          gap: 40,
          alignItems: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: leftWidth,
            justifyContent: 'center',
            gap: 20,
          }}
        >
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
          width={rightWidth}
          maxHeight={frameMaxHeight}
        />
      </div>
    )
  }

  // Square / Portrait: accent bar + centered text above frame
  const frameWidth = width - pad * 2
  const frameMaxHeight = Math.round(height * 0.55)

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
        alignItems: 'center',
      }}
    >
      {/* Accent bar */}
      <div
        style={{
          display: 'flex',
          width: 48,
          height: 4,
          backgroundColor: brand.colors.primary,
          borderRadius: 2,
        }}
      />
      <TextBlock
        title={slide.title}
        description={slide.description}
        textColor={brand.colors.text}
        size="small"
      />
      <LogoBar brand={brand} />
      <BrowserFrame
        imageBase64={slide.imageBase64!}
        primaryColor={brand.colors.primary}
        width={frameWidth}
        maxHeight={frameMaxHeight}
      />
    </div>
  )
}
