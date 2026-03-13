import { describe, it, expect } from 'vitest'
import { validateReleaseColors } from '../validation'

describe('release request validation', () => {
  it('passes when brand_id is provided', () => {
    expect(validateReleaseColors({ brand_id: 'brand_xxx', formats: [{ name: 'landscape', slides: [{}] }] })).toBeNull()
  })

  it('passes when colors are provided without brand_id', () => {
    expect(validateReleaseColors({
      colors: { background: '#fff', text: '#000', primary: '#f00' },
      formats: [{ name: 'landscape', slides: [{}] }],
    })).toBeNull()
  })

  it('fails when neither brand_id nor colors provided', () => {
    expect(validateReleaseColors({ formats: [{ name: 'landscape', slides: [{}] }] })).toMatch(/colors/)
  })

  it('fails when colors is incomplete', () => {
    expect(validateReleaseColors({
      colors: { background: '#fff' },
      formats: [{ name: 'landscape', slides: [{}] }],
    })).toMatch(/colors/)
  })
})
