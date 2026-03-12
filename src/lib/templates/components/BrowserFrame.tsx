import React from 'react'

interface BrowserFrameProps {
  imageBase64: string
  primaryColor: string
  width: number
  maxHeight?: number
  flush?: boolean
  color?: 'light' | 'dark'
}

export function BrowserFrame({ imageBase64, primaryColor, width, maxHeight, flush, color = 'light' }: BrowserFrameProps) {
  const dotSize = 10
  const titleBarHeight = 32
  const imageHeight = maxHeight ? maxHeight - titleBarHeight : undefined
  const isDark = color === 'dark'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: `${width}px`,
        borderRadius: flush ? '12px 12px 0 0' : '12px',
        overflow: 'hidden',
        border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
        borderBottom: flush ? 'none' : isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 12px 48px rgba(0,0,0,0.20), 0 2px 8px rgba(0,0,0,0.10)',
      }}
    >
      {/* Title bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: titleBarHeight,
          backgroundColor: isDark ? '#2A2A2A' : '#F0F0F0',
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
          height: imageHeight ? `${imageHeight}px` : undefined,
          objectFit: 'cover',
          objectPosition: 'top',
        }}
      />
    </div>
  )
}
