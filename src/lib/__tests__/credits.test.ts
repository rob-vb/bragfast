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

  it('charges 5 credits per slide per format for video: true', () => {
    expect(calculateCredits({
      video: true,
      formats: [
        { name: 'landscape', slides: [{}] },
        { name: 'square', slides: [{}] },
      ],
    })).toBe(10)
  })

  it('charges 5 credits per slide per format for video: { duration }', () => {
    expect(calculateCredits({
      video: { duration: 10 },
      formats: [{ name: 'landscape', slides: [{}] }],
    })).toBe(5)
  })

  it('scales video credits with slide count', () => {
    expect(calculateCredits({
      video: true,
      formats: [
        { name: 'landscape', slides: [{}, {}, {}] },
        { name: 'square', slides: [{}, {}, {}] },
      ],
    })).toBe(30) // 3 slides × 2 formats × 5 = 30
  })

  it('charges 5 credits for single-slide single-format video', () => {
    expect(calculateCredits({
      video: true,
      formats: [{ name: 'landscape', slides: [{}] }],
    })).toBe(5)
  })
})
