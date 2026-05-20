import React from 'react'

interface TextBlockProps {
  title: string
  description?: string
  textColor: string
  size: 'large' | 'medium' | 'small'
  align?: 'left' | 'center' | 'right'
}

const sizeConfig = {
  large: { title: 72, description: 32, lineHeight: 1.15, gap: 20 },
  medium: { title: 64, description: 30, lineHeight: 1.2, gap: 16 },
  small: { title: 48, description: 22, lineHeight: 1.3, gap: 12 },
}

const alignItems = { left: 'flex-start', center: 'center', right: 'flex-end' } as const

export function TextBlock({ title, description, textColor, size, align = 'left' }: TextBlockProps) {
  const config = sizeConfig[size]
  const centerStyles = { alignItems: alignItems[align], textAlign: align as 'left' | 'center' | 'right' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: config.gap, ...centerStyles }}>
      <span
        style={{
          fontSize: config.title,
          fontWeight: 700,
          color: textColor,
          lineHeight: config.lineHeight,
          fontFamily: 'Plus Jakarta Sans',
        }}
      >
        {title}
      </span>
      {description && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: Math.round(config.description * 0.4) }}>
          {description.split('\n').map((line, i) => (
            <span
              key={i}
              style={{
                fontSize: config.description,
                fontWeight: 400,
                color: textColor,
                opacity: 0.75,
                lineHeight: 1.5,
                fontFamily: 'Plus Jakarta Sans',
              }}
            >
              {line}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
