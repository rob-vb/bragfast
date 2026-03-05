import React from 'react'
import { Brand } from '../../types'

interface LogoBarProps {
  brand: Brand
}

export function LogoBar({ brand }: LogoBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <img
        src={brand.logoBase64}
        width={48}
        height={48}
        style={{ display: 'flex', borderRadius: 8 }}
      />
      <span
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: brand.colors.text,
          fontFamily: 'Plus Jakarta Sans',
        }}
      >
        {brand.name}
      </span>
    </div>
  )
}
