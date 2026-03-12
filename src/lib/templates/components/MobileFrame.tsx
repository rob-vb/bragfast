import React from 'react'

interface MobileFrameProps {
  imageBase64: string
  primaryColor: string
  width: number
  maxHeight?: number
  flush?: boolean
  color?: string  // hex color for frame chrome
}

export function MobileFrame({ imageBase64, primaryColor, width, maxHeight, flush, color = '#1A1A1A' }: MobileFrameProps) {
  const bezel = Math.round(width * 0.025)
  const cornerRadius = Math.round(width * 0.12)
  const innerRadius = Math.max(0, cornerRadius - bezel)
  const screenWidth = width - bezel * 2

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: `${width}px`,
        // maxHeight handled by parent container clipping
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
          borderRadius: flush
            ? `${innerRadius}px ${innerRadius}px 0 0`
            : `${innerRadius}px`,
          overflow: 'hidden',
        }}
      >
        <img
          src={imageBase64}
          width={screenWidth}
          style={{
            display: 'flex',
            width: `${screenWidth}px`,
            objectFit: 'cover',
            objectPosition: 'top',
            borderRadius: flush
              ? `${innerRadius}px ${innerRadius}px 0 0`
              : `${innerRadius}px`,
          }}
        />
      </div>

      {/* Bottom bezel */}
      {!flush && (
        <div style={{ display: 'flex', width: '100%', height: bezel, flexShrink: 0 }} />
      )}
    </div>
  )
}
