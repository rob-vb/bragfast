import React from 'react'

interface MobileFrameProps {
  imageBase64: string
  primaryColor: string
  width: number
  maxHeight?: number
  flush?: boolean
}

export function MobileFrame({ imageBase64, primaryColor, width, maxHeight, flush }: MobileFrameProps) {
  const bezel = Math.round(width * 0.035)
  const cornerRadius = Math.round(width * 0.12)
  const innerRadius = Math.round(cornerRadius * 0.6)
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
        backgroundColor: '#1A1A1A',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.08)',
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
