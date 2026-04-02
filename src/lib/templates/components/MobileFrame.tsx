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
  const isContain = objectFit === 'contain'

  const alignMap = { top: 'flex-start', center: 'center', bottom: 'flex-end' } as const

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
            borderRadius: flush ? `${innerRadius}px ${innerRadius}px 0 0` : `${innerRadius}px`,
            overflow: 'hidden',
            justifyContent: alignMap[anchorY],
          }}
        >
          <img
            src={imageBase64}
            style={{
              display: 'flex',
              width: '100%',
              borderRadius: flush
                ? `${innerRadius}px ${innerRadius}px 0 0`
                : `${innerRadius}px`,
            }}
          />
        </div>
      ) : (
        <img
          src={imageBase64}
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            borderRadius: flush ? `${innerRadius}px ${innerRadius}px 0 0` : `${innerRadius}px`,
            objectFit: 'cover',
            objectPosition,
          }}
        />
      )}
    </div>
  )
}
