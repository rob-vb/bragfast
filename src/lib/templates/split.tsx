import React from 'react'
import { TemplateProps } from '../types'
import { LogoBar } from './components/LogoBar'
import { TextBlock } from './components/TextBlock'
import { BrowserFrame } from './components/BrowserFrame'

export function Split({ slide, brand, width, height }: TemplateProps) {
  const pad = 48
  const isLandscape = width > height
  const hasImage = !!slide.imageBase64

  // Text-only: centered layout (same as Classic fallback)
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
          size={isLandscape ? 'large' : 'medium'}
        />
      </div>
    )
  }

  if (isLandscape) {
    // Side-by-side: left text (~45%), right image (~55%)
    const leftWidth = Math.round(width * 0.42)
    const rightWidth = Math.round(width * 0.52)

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          width,
          height,
          backgroundColor: brand.colors.background,
          padding: pad,
          gap: pad / 2,
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
        />
      </div>
    )
  }

  // Square / Portrait: stacked with tighter text area
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
