import React from 'react'

interface TextBlockProps {
  title: string
  description?: string
  textColor: string
  size: 'large' | 'medium' | 'small'
}

const sizeConfig = {
  large: { title: 48, description: 24, lineHeight: 1.2 },
  medium: { title: 40, description: 20, lineHeight: 1.25 },
  small: { title: 36, description: 18, lineHeight: 1.3 },
}

export function TextBlock({ title, description, textColor, size }: TextBlockProps) {
  const config = sizeConfig[size]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
        <span
          style={{
            fontSize: config.description,
            fontWeight: 400,
            color: textColor,
            opacity: 0.75,
            lineHeight: 1.5,
            fontFamily: 'Plus Jakarta Sans',
          }}
        >
          {description}
        </span>
      )}
    </div>
  )
}
