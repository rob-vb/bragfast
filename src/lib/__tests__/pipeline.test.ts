import { describe, it, expect } from 'vitest'
import { createRelease, renderReleaseAsync, getRelease } from '../pipeline/render'

describe('release pipeline', () => {
  it('creates a pending release and renders to completed', async () => {
    const request = {
      brand_id: 'br_test',
      template: 'classic' as const,
      slides: [{ title: 'Test Feature', description: 'A test description' }],
      formats: ['landscape'] as const,
    }
    const pending = await createRelease(request)
    expect(pending.release_id).toMatch(/^rel_/)
    expect(pending.status).toBe('pending')
    expect(pending.images).toBeNull()

    await renderReleaseAsync(pending.release_id, request)

    const completed = await getRelease(pending.release_id)
    expect(completed?.status).toBe('completed')
    expect(completed?.images?.landscape.slides).toHaveLength(1)
    expect(completed?.images?.landscape.dimensions).toBe('1200x675')
    expect(completed?.completed_at).toBeDefined()
  }, 30000)

  it('renders transparent PNG without error', async () => {
    const request = {
      brand_id: 'br_test',
      template: 'classic' as const,
      slides: [{ title: 'Transparent Slide' }],
      formats: ['square'] as const,
      transparent: true,
    }
    const pending = await createRelease(request)
    await renderReleaseAsync(pending.release_id, request)
    const completed = await getRelease(pending.release_id)
    expect(completed?.status).toBe('completed')
    expect(completed?.transparent).toBe(true)
  }, 30000)
})
