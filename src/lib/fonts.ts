import { readFileSync } from 'fs'
import path from 'path'

interface FontConfig {
  name: string
  data: ArrayBuffer
  weight: number
  style: string
}

let cachedFonts: FontConfig[] | null = null

export function loadFonts(): FontConfig[] {
  if (cachedFonts) return cachedFonts

  const fontsDir = path.join(process.cwd(), 'src/assets/fonts')

  const regular = readFileSync(path.join(fontsDir, 'PlusJakartaSans-Regular.ttf'))
  const bold = readFileSync(path.join(fontsDir, 'PlusJakartaSans-Bold.ttf'))

  cachedFonts = [
    { name: 'Plus Jakarta Sans', data: regular.buffer as ArrayBuffer, weight: 400, style: 'normal' },
    { name: 'Plus Jakarta Sans', data: bold.buffer as ArrayBuffer, weight: 700, style: 'normal' },
  ]
  return cachedFonts
}
