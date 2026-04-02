import React from 'react'

interface BrowserFrameProps {
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

export function BrowserFrame({ imageBase64, primaryColor, width, maxHeight, flush, color = '#E8E8E8', objectPosition = 'center top', objectFit = 'cover', anchorY = 'top' }: BrowserFrameProps) {
  const dotSize = 10
  const titleBarHeight = 32
  const imageHeight = maxHeight ? maxHeight - titleBarHeight : undefined
  const isContain = objectFit === 'contain'

  const alignMap = { top: 'flex-start', center: 'center', bottom: 'flex-end' } as const

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: `${width}px`,
        borderRadius: flush ? '12px 12px 0 0' : '12px',
        overflow: 'hidden',
        border: '1px solid rgba(0,0,0,0.08)',
        borderBottom: flush ? 'none' : '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 12px 48px rgba(0,0,0,0.20), 0 2px 8px rgba(0,0,0,0.10)',
      }}
    >
      {/* Title bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: titleBarHeight,
          backgroundColor: color,
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
      {isContain ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          width: `${width}px`,
          height: imageHeight ? `${imageHeight}px` : undefined,
          overflow: 'hidden',
          justifyContent: alignMap[anchorY],
        }}>
          <img
            src={imageBase64}
            width={width}
            style={{ display: 'flex', width: `${width}px` }}
          />
        </div>
      ) : (
        <img
          src={imageBase64}
          width={width}
          style={{
            display: 'flex',
            width: `${width}px`,
            height: imageHeight ? `${imageHeight}px` : undefined,
            objectFit: 'cover',
            objectPosition,
          }}
        />
      )}
    </div>
  )
}
