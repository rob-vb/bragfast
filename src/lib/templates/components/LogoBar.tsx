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
        width={32}
        height={32}
        style={{ display: 'flex', borderRadius: 6 }}
      />
      <span
        style={{
          fontSize: 18,
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
