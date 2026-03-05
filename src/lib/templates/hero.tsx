import React from 'react'
import { TemplateProps } from '../types'

export function Hero({ slide, brand, width, height }: TemplateProps) {
  const pad = 56
  const isLandscape = width > height
  const hasImage = !!slide.imageBase64
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
          gap: 24,
        }}
      >
        {/* Text block */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            maxWidth: isLandscape ? '65%' : '100%',
            alignItems: isLandscape ? 'flex-start' : 'center',
            textAlign: isLandscape ? 'left' : 'center',
          }}
        >
          <span
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
          {slide.description && (
            <span
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
          )}
        </div>

        {/* Logo row — below text, separated */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            alignSelf: isLandscape ? 'flex-start' : 'center',
          }}
        >
          <img
            src={brand.logoBase64}
            width={24}
            height={24}
            style={{ display: 'flex', borderRadius: 5 }}
          />
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: textColor,
              opacity: 0.7,
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
