import React from 'react'

interface BrowserFrameProps {
  imageBase64: string
  primaryColor: string
  width: number
  maxHeight?: number
}

export function BrowserFrame({ imageBase64, primaryColor, width, maxHeight }: BrowserFrameProps) {
  const dotSize = 10
  const titleBarHeight = 32

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: `${width}px`,
        maxHeight: maxHeight ? `${maxHeight}px` : undefined,
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      {/* Title bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: titleBarHeight,
          backgroundColor: '#F0F0F0',
          padding: '0 14px',
          gap: 7,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', width: dotSize, height: dotSize, borderRadius: '50%', backgroundColor: '#FF5F57' }} />
        <div style={{ display: 'flex', width: dotSize, height: dotSize, borderRadius: '50%', backgroundColor: '#FFBD2E' }} />
        <div style={{ display: 'flex', width: dotSize, height: dotSize, borderRadius: '50%', backgroundColor: '#27C93F' }} />
      </div>
      {/* Screenshot */}
      <img
        src={imageBase64}
        width={width}
        style={{
          display: 'flex',
          width: `${width}px`,
          objectFit: 'cover',
          objectPosition: 'top',
        }}
      />
    </div>
  )
}
