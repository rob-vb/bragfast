import { describe, it, expect } from 'vitest'
import { loadFontsForFamily, loadFonts } from '../fonts'

describe('loadFontsForFamily', () => {
  it('returns Plus Jakarta Sans from local files when no family given', async () => {
    const fonts = await loadFontsForFamily(undefined)
    expect(fonts).toHaveLength(2)
    expect(fonts[0].name).toBe('Plus Jakarta Sans')
    expect(fonts[0].weight).toBe(400)
    expect(fonts[1].weight).toBe(700)
  })

  it('returns Plus Jakarta Sans when given the local family name', async () => {
    const fonts = await loadFontsForFamily('Plus Jakarta Sans')
    expect(fonts).toHaveLength(2)
    expect(fonts[0].name).toBe('Plus Jakarta Sans')
  })

  it('backward-compat loadFonts still works', () => {
    const fonts = loadFonts()
    expect(fonts).toHaveLength(2)
    expect(fonts[0].name).toBe('Plus Jakarta Sans')
  })
})
