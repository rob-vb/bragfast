import { describe, it, expect } from 'vitest'
import { validateFormats } from '../validation'

describe('validateFormats', () => {
  it('rejects missing formats', () => {
    expect(validateFormats(undefined)).toMatch(/formats/)
  })

  it('rejects empty formats array', () => {
    expect(validateFormats([])).toMatch(/at least 1/)
  })

  it('rejects invalid format name', () => {
    expect(validateFormats([{ name: 'banner', slides: [{}] }])).toMatch(/Invalid format/)
  })

  it('rejects duplicate format names', () => {
    expect(validateFormats([
      { name: 'landscape', slides: [{}] },
      { name: 'landscape', slides: [{}] },
    ])).toMatch(/uplicate/)
  })

  it('rejects format with no slides', () => {
    expect(validateFormats([{ name: 'landscape', slides: [] }])).toMatch(/at least 1 slide/)
  })

  it('rejects format with >5 slides', () => {
    expect(validateFormats([{ name: 'landscape', slides: [{},{},{},{},{},{}] }])).toMatch(/5 slides/)
  })

  it('rejects invalid anchor_x', () => {
    expect(validateFormats([{
      name: 'landscape',
      slides: [{ objects: [{ id: 'img', anchor_x: 'invalid' }] }],
    }])).toMatch(/anchor_x/)
  })

  it('rejects invalid anchor_y', () => {
    expect(validateFormats([{
      name: 'square',
      slides: [{ objects: [{ id: 'img', anchor_y: 'invalid' }] }],
    }])).toMatch(/anchor_y/)
  })

  it('rejects object without id', () => {
    expect(validateFormats([{
      name: 'landscape',
      slides: [{ objects: [{ text: 'hello' }] }],
    }])).toMatch(/id/)
  })

  it('passes valid formats', () => {
    expect(validateFormats([
      { name: 'landscape', slides: [{ objects: [{ id: 'title', text: 'hi' }] }] },
      { name: 'square', slides: [{}, { objects: [{ id: 'image', anchor_y: 'top' }] }] },
    ])).toBeNull()
  })
})
