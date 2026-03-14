import { describe, it, expect } from 'vitest'
import { calculateCredits } from '../types'

describe('calculateCredits', () => {
  it('sums slides across all format entries', () => {
    expect(calculateCredits({
      output: 'image',
      formats: [
        { name: 'landscape', slides: [{}] },
        { name: 'square', slides: [{}, {}] },
      ],
    })).toBe(3)
  })

  it('returns 0 for empty formats', () => {
    expect(calculateCredits({ formats: [] })).toBe(0)
  })
})
