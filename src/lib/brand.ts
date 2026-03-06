import { Brand } from './types'

let cachedBrand: Brand | null = null

export function getPlaceholderBrand(): Brand {
  if (cachedBrand) return cachedBrand

  cachedBrand = {
    name: 'Hoppa',
    logoBase64: '',
    website: 'https://hoppa.app',
    colors: {
      background: '#FFF8F0',
      text: '#1A1A1A',
      primary: '#FF6B35',
    },
  }
  return cachedBrand
}
