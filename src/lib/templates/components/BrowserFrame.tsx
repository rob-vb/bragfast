import React from 'react'

export interface FramedMediaStyle {
  width: number
  height?: number
  objectFit: 'cover' | 'contain'
  objectPosition: string
}

interface BrowserFrameProps {
  imageBase64?: string
  /** Optional override: renders a custom element (e.g. OffthreadVideo) in place of the default <img>. */
  renderMedia?: (style: FramedMediaStyle) => React.ReactNode
  primaryColor: string
  width: number
  maxHeight?: number
  flush?: boolean
  color?: string  // hex color for frame chrome
  objectPosition?: string  // CSS object-position for the screenshot
  objectFit?: 'cover' | 'contain'  // CSS object-fit for the screenshot
  anchorY?: 'top' | 'center' | 'bottom'
}

export function BrowserFrame({ imageBase64, renderMedia, primaryColor, width, maxHeight, flush, color = '#E8E8E8', objectPosition = 'center top', objectFit = 'cover', anchorY = 'top' }: BrowserFrameProps) {
  const dotSize = 10
  const titleBarHeight = 32
  const imageHeight = maxHeight ? maxHeight - titleBarHeight : undefined
  const isContain = objectFit === 'contain'

  const alignMap = { top: 'flex-start', center: 'center', bottom: 'flex-end' } as const

  const defaultImg = (style: React.CSSProperties) =>
    imageBase64 ? <img src={imageBase64} width={width} style={style} /> : null

  const mediaNode = (style: FramedMediaStyle, extra: React.CSSProperties = {}) => {
    const fullStyle: React.CSSProperties = {
      display: 'flex',
      width: `${style.width}px`,
      ...(style.height ? { height: `${style.height}px` } : {}),
      ...(style.objectFit === 'cover'
        ? { objectFit: 'cover' as const, objectPosition: style.objectPosition }
        : {}),
      ...extra,
    }
    return renderMedia ? renderMedia(style) : defaultImg(fullStyle)
  }

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
          ...(imageHeight ? { height: `${imageHeight}px` } : {}),
          overflow: 'hidden',
          justifyContent: alignMap[anchorY],
        }}>
          {mediaNode({ width, objectFit: 'contain', objectPosition })}
        </div>
      ) : (
        mediaNode({ width, height: imageHeight, objectFit: 'cover', objectPosition })
      )}
    </div>
  )
}
