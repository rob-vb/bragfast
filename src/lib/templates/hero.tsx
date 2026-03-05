import React from 'react'
import { TemplateProps } from '../types'

export function Hero({ slide, brand, width, height }: TemplateProps) {
  const pad = 48
  const isLandscape = width > height
  const hasImage = !!slide.imageBase64

  // Inverted colors: text in background color on primary overlay
  const textColor = brand.colors.background

  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        width,
        height,
        backgroundColor: brand.colors.primary,
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
        }}
      >
        {/* Text block */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            maxWidth: isLandscape ? '60%' : '100%',
            alignItems: isLandscape ? 'flex-start' : 'center',
            textAlign: isLandscape ? 'left' : 'center',
          }}
        >
          <span
            style={{
              fontSize: isLandscape ? 48 : 40,
              fontWeight: 700,
              color: textColor,
              lineHeight: 1.2,
              fontFamily: 'Plus Jakarta Sans',
            }}
          >
            {slide.title}
          </span>
          {slide.description && (
            <span
              style={{
                fontSize: isLandscape ? 24 : 20,
                fontWeight: 400,
                color: textColor,
                opacity: 0.9,
                lineHeight: 1.5,
                fontFamily: 'Plus Jakarta Sans',
              }}
            >
              {slide.description}
            </span>
          )}
        </div>

        {/* Logo bottom-right */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            bottom: pad,
            right: pad,
            alignItems: 'center',
            gap: 8,
          }}
        >
          <img
            src={brand.logoBase64}
            width={28}
            height={28}
            style={{ display: 'flex', borderRadius: 6 }}
          />
          <span
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: textColor,
              fontFamily: 'Plus Jakarta Sans',
            }}
          >
            {brand.name}
          </span>
        </div>
      </div>
    </div>
  )
}
