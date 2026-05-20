import React from 'react'
import type { Brand } from '../types'

interface LogoBarProps {
  brand: Brand
  align?: 'left' | 'center' | 'right'
}

const alignSelf = { left: 'flex-start', center: 'center', right: 'flex-end' } as const

export function LogoBar({ brand, align = 'left' }: LogoBarProps) {
  if (!brand.logoBase64) return null

  return (
    <img
      src={brand.logoBase64}
      style={{ display: 'flex', maxHeight: 48, borderRadius: 8, alignSelf: alignSelf[align] }}
    />
  )
}
