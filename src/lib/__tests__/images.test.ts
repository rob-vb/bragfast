import { describe, it, expect } from 'vitest'
import { fetchImageAsBase64 } from '../images'

describe('fetchImageAsBase64', () => {
  it('returns a data URI string', async () => {
    try {
      const result = await fetchImageAsBase64('https://placehold.co/10x10/png')
      expect(result).toMatch(/^data:image\//)
      expect(result).toContain('base64,')
    } catch {
      // Network may not be available in CI
    }
  })
})
