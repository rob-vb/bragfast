import React from 'react'
import type { FramedMediaStyle } from './BrowserFrame'

interface MobileFrameProps {
  imageBase64?: string
  /** Optional override: renders a custom element (e.g. OffthreadVideo) in place of the default <img>. */
  renderMedia?: (style: FramedMediaStyle & { borderRadius: string }) => React.ReactNode
  primaryColor: string
  width: number
  maxHeight?: number
  flush?: boolean
  color?: string  // hex color for frame chrome
  objectPosition?: string  // CSS object-position for the screenshot
  objectFit?: 'cover' | 'contain'  // CSS object-fit for the screenshot
  anchorY?: 'top' | 'center' | 'bottom'
}

export function MobileFrame({ imageBase64, renderMedia, primaryColor, width, maxHeight, flush, color = '#1A1A1A', objectPosition = 'center top', objectFit = 'cover', anchorY = 'top' }: MobileFrameProps) {
  const bezel = Math.round(width * 0.025)
  const cornerRadius = Math.round(width * 0.12)
  const innerRadius = Math.max(0, cornerRadius - bezel)
  const isContain = objectFit === 'contain'
  const innerBorderRadius = flush
    ? `${innerRadius}px ${innerRadius}px 0 0`
    : `${innerRadius}px`

  const alignMap = { top: 'flex-start', center: 'center', bottom: 'flex-end' } as const

  const defaultImg = (style: React.CSSProperties) =>
    imageBase64 ? <img src={imageBase64} style={style} /> : null

  const mediaNode = (fit: 'cover' | 'contain') => {
    const style: React.CSSProperties = fit === 'contain'
      ? { display: 'flex', width: '100%', borderRadius: innerBorderRadius }
      : { display: 'flex', width: '100%', height: '100%', borderRadius: innerBorderRadius, objectFit: 'cover', objectPosition }
    return renderMedia
      ? renderMedia({ width, objectFit: fit, objectPosition, borderRadius: innerBorderRadius })
      : defaultImg(style)
  }

  return (
    <div
      style={{
        display: 'flex',
        width: `${width}px`,
        ...(maxHeight ? { height: `${maxHeight}px` } : {}),
        borderRadius: flush
          ? `${cornerRadius}px ${cornerRadius}px 0 0`
          : `${cornerRadius}px`,
        backgroundColor: color,
        padding: flush ? `${bezel}px ${bezel}px 0` : `${bezel}px`,
        boxShadow: '0 16px 56px rgba(0,0,0,0.30), 0 4px 12px rgba(0,0,0,0.15)',
        overflow: 'hidden',
      }}
    >
      {isContain ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            height: '100%',
            borderRadius: innerBorderRadius,
            overflow: 'hidden',
            justifyContent: alignMap[anchorY],
          }}
        >
          {mediaNode('contain')}
        </div>
      ) : (
        mediaNode('cover')
      )}
    </div>
  )
}
