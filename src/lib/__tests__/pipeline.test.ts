import { describe, it, expect } from 'vitest'
import { renderRelease } from '../pipeline/render'

describe('renderRelease', () => {
  it('generates images for a single slide in one format', async () => {
    const result = await renderRelease({
      brand_id: 'br_test',
      template: 'classic',
      slides: [{ title: 'Test Feature', description: 'A test description' }],
      formats: ['landscape'],
    })

    expect(result.release_id).toMatch(/^rel_/)
    expect(result.images.landscape.slides).toHaveLength(1)
    expect(result.images.landscape.dimensions).toBe('1200x675')
  }, 30000)
})
