import { describe, it, expect } from 'vitest'
import { calculateCredits } from '../types'

describe('calculateCredits', () => {
  it('sums slides across all format entries for images', () => {
    expect(calculateCredits({
      formats: [
        { name: 'landscape', slides: [{}] },
        { name: 'square', slides: [{}, {}] },
      ],
    })).toBe(3)
  })

  it('returns 0 for empty formats', () => {
    expect(calculateCredits({ formats: [] })).toBe(0)
  })

  it('charges 5 credits per format for video: true', () => {
    expect(calculateCredits({
      video: true,
      formats: [{ name: 'landscape' }, { name: 'square' }],
    })).toBe(10)
  })

  it('charges 5 credits per format for video: { duration }', () => {
    expect(calculateCredits({
      video: { duration: 10 },
      formats: [{ name: 'landscape' }],
    })).toBe(5)
  })
})
