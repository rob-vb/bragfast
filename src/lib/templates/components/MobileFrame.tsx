import React from 'react'

interface MobileFrameProps {
  imageBase64: string
  primaryColor: string
  width: number
  maxHeight?: number
  flush?: boolean
  color?: string  // hex color for frame chrome
  objectPosition?: string  // CSS object-position for the screenshot
  objectFit?: 'cover' | 'contain'  // CSS object-fit for the screenshot
  anchorY?: 'top' | 'center' | 'bottom'
}

export function MobileFrame({ imageBase64, primaryColor, width, maxHeight, flush, color = '#1A1A1A', objectPosition = 'center top', objectFit = 'cover', anchorY = 'top' }: MobileFrameProps) {
  const bezel = Math.round(width * 0.025)
  const cornerRadius = Math.round(width * 0.12)
  const innerRadius = Math.max(0, cornerRadius - bezel)
  const screenWidth = width - bezel * 2
  const totalBezel = flush ? bezel : bezel * 2
  const imageHeight = maxHeight ? maxHeight - totalBezel : undefined
  const isContain = objectFit === 'contain'

  const alignMap = { top: 'flex-start', center: 'center', bottom: 'flex-end' } as const

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: `${width}px`,
        borderRadius: flush
          ? `${cornerRadius}px ${cornerRadius}px 0 0`
          : `${cornerRadius}px`,
        backgroundColor: color,
        boxShadow: '0 16px 56px rgba(0,0,0,0.30), 0 4px 12px rgba(0,0,0,0.15)',
        overflow: 'hidden',
      }}
    >
      {/* Top bezel */}
      <div style={{ display: 'flex', width: '100%', height: bezel, flexShrink: 0 }} />

      {/* Screen */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: `${screenWidth}px`,
          height: imageHeight ? `${imageHeight}px` : undefined,
          borderRadius: flush
            ? `${innerRadius}px ${innerRadius}px 0 0`
            : `${innerRadius}px`,
          overflow: 'hidden',
          justifyContent: isContain ? alignMap[anchorY] : undefined,
        }}
      >
        {isContain ? (
          <img
            src={imageBase64}
            width={screenWidth}
            style={{
              display: 'flex',
              width: `${screenWidth}px`,
              borderRadius: flush
                ? `${innerRadius}px ${innerRadius}px 0 0`
                : `${innerRadius}px`,
            }}
          />
        ) : (
          <img
            src={imageBase64}
            width={screenWidth}
            style={{
              display: 'flex',
              width: `${screenWidth}px`,
              height: imageHeight ? `${imageHeight}px` : undefined,
              objectFit: 'cover',
              objectPosition,
              borderRadius: flush
                ? `${innerRadius}px ${innerRadius}px 0 0`
                : `${innerRadius}px`,
            }}
          />
        )}
      </div>

      {/* Bottom bezel */}
      {!flush && (
        <div style={{ display: 'flex', width: '100%', height: bezel, flexShrink: 0 }} />
      )}
    </div>
  )
}
