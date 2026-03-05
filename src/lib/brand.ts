import { Brand } from './types'
import { readFileSync } from 'fs'
import path from 'path'

let cachedBrand: Brand | null = null

export function getPlaceholderBrand(): Brand {
  if (cachedBrand) return cachedBrand

  const logoPath = path.join(process.cwd(), 'src/assets/placeholder-logo.png')
  let logoBase64: string
  try {
    const logoBuffer = readFileSync(logoPath)
    logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`
  } catch {
    // Fallback: 1x1 transparent PNG
    logoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
  }

  cachedBrand = {
    name: 'Hoppa',
    logoBase64,
    website: 'https://hoppa.app',
    colors: {
      background: '#FFF8F0',
      text: '#1A1A1A',
      primary: '#FF6B35',
    },
  }
  return cachedBrand
}
