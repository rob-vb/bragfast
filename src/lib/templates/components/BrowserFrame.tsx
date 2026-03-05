import React from 'react'

interface BrowserFrameProps {
  imageBase64: string
  primaryColor: string
  width: number
}

export function BrowserFrame({ imageBase64, primaryColor, width }: BrowserFrameProps) {
  const dotSize = 12
  const titleBarHeight = 36

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: `${width}px`,
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      }}
    >
      {/* Title bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: titleBarHeight,
          backgroundColor: '#E8E8E8',
          padding: '0 12px',
          gap: 8,
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
        }}
      />
    </div>
  )
}
