import { describe, it, expect, vi } from 'vitest'
import { renderHyperframe } from '../pipeline/render-hyperframe'
import type { VariableManifest } from '../templates/hyperframe-manifest'
import type { Brand } from '../templates/hyperframe-variables'

const brand: Brand = {
  background: '#fff8f0',
  text: '#4a3326',
  primary: '#d97706',
  logoUrl: 'https://example.com/logo.png',
}

const manifest: VariableManifest = [
  { id: 'headline', type: 'string', label: 'Headline' },
]

function makeDeps(overrides: Partial<Parameters<typeof renderHyperframe>[1]> = {}) {
  return {
    readComposition: vi.fn(async () => ({ html: '<html></html>' })),
    mintPresignedPutUrl: vi.fn(async (key: string) => ({
      url: `https://r2.signed/${key}`,
      publicUrl: `https://r2.public/${key}`,
    })),
    invokeLambda: vi.fn(async () => ({ ok: true as const, durationMs: 1234 })),
    markCompleted: vi.fn(async () => {}),
    markFailed: vi.fn(async () => {}),
    refundCredits: vi.fn(async () => {}),
    ...overrides,
  }
}

describe('renderHyperframe', () => {
  it('happy path: reads composition, mints url, invokes lambda, marks completed', async () => {
    const deps = makeDeps()

    const result = await renderHyperframe(
      {
        releaseId: 'rel_1',
        templateId: 'milestone',
        formats: ['square'],
        cookInput: { headline: 'Shipped' },
        brand,
        manifest,
        duration: 10,
        creditsPerFormat: 5,
      },
      deps,
    )

    expect(result).toEqual({ ok: true })
    expect(deps.readComposition).toHaveBeenCalledWith('milestone', 'square')
    expect(deps.mintPresignedPutUrl).toHaveBeenCalledWith('releases/rel_1/square.mp4')
    expect(deps.invokeLambda).toHaveBeenCalledWith({
      html: '<html></html>',
      templateId: 'milestone',
      variables: { headline: 'Shipped' },
      format: 'square',
      duration: 10,
      presignedPutUrl: 'https://r2.signed/releases/rel_1/square.mp4',
    })
    expect(deps.markCompleted).toHaveBeenCalledWith('rel_1', [
      { format: 'square', url: 'https://r2.public/releases/rel_1/square.mp4' },
    ])
    expect(deps.markFailed).not.toHaveBeenCalled()
    expect(deps.refundCredits).not.toHaveBeenCalled()
  })

  it('all formats fail: refunds all credits, marks failed, returns ok:false', async () => {
    const deps = makeDeps({
      invokeLambda: vi.fn(async () => ({ ok: false as const, reason: 'lambda timeout' })),
    })

    const result = await renderHyperframe(
      {
        releaseId: 'rel_2',
        templateId: 'milestone',
        formats: ['square'],
        cookInput: { headline: 'Shipped' },
        brand,
        manifest,
        duration: 10,
        creditsPerFormat: 5,
      },
      deps,
    )

    expect(result).toEqual({ ok: false, reason: 'lambda timeout' })
    expect(deps.refundCredits).toHaveBeenCalledWith('rel_2', 5)
    expect(deps.markFailed).toHaveBeenCalledWith('rel_2', 'lambda timeout')
    expect(deps.markCompleted).not.toHaveBeenCalled()
  })

  it('partial failure: refunds only failed format, marks completed with successes', async () => {
    let call = 0
    const deps = makeDeps({
      invokeLambda: vi.fn(async () => {
        call++
        if (call === 2) return { ok: false as const, reason: 'square failed' }
        return { ok: true as const, durationMs: 1000 }
      }),
    })

    const result = await renderHyperframe(
      {
        releaseId: 'rel_3',
        templateId: 'milestone',
        formats: ['landscape', 'square', 'portrait'],
        cookInput: { headline: 'Shipped' },
        brand,
        manifest,
        duration: 10,
        creditsPerFormat: 5,
      },
      deps,
    )

    expect(result).toEqual({ ok: true })
    expect(deps.refundCredits).toHaveBeenCalledWith('rel_3', 5)
    expect(deps.markCompleted).toHaveBeenCalledWith('rel_3', [
      { format: 'landscape', url: 'https://r2.public/releases/rel_3/landscape.mp4' },
      { format: 'portrait', url: 'https://r2.public/releases/rel_3/portrait.mp4' },
    ])
    expect(deps.markFailed).not.toHaveBeenCalled()
  })

  it('partial failure: uses per-format credit costs when supplied', async () => {
    let call = 0
    const deps = makeDeps({
      invokeLambda: vi.fn(async () => {
        call++
        if (call === 2) return { ok: false as const, reason: 'square failed' }
        return { ok: true as const, durationMs: 1000 }
      }),
    })

    const result = await renderHyperframe(
      {
        releaseId: 'rel_weighted',
        templateId: 'milestone',
        formats: ['landscape', 'square', 'portrait'],
        cookInput: { headline: 'Shipped' },
        brand,
        manifest,
        duration: 10,
        creditsPerFormat: 5,
        creditsByFormat: { landscape: 5, square: 15, portrait: 10 },
      },
      deps,
    )

    expect(result).toEqual({ ok: true })
    expect(deps.refundCredits).toHaveBeenCalledWith('rel_weighted', 15)
  })

  it('all formats fail across multi-format: refunds full total, marks failed', async () => {
    const deps = makeDeps({
      invokeLambda: vi.fn(async () => ({ ok: false as const, reason: 'lambda crashed' })),
    })

    const result = await renderHyperframe(
      {
        releaseId: 'rel_4',
        templateId: 'milestone',
        formats: ['landscape', 'square', 'portrait'],
        cookInput: { headline: 'Shipped' },
        brand,
        manifest,
        duration: 10,
        creditsPerFormat: 5,
      },
      deps,
    )

    expect(result).toEqual({ ok: false, reason: 'lambda crashed' })
    expect(deps.refundCredits).toHaveBeenCalledWith('rel_4', 15)
    expect(deps.markFailed).toHaveBeenCalledWith('rel_4', 'lambda crashed')
    expect(deps.markCompleted).not.toHaveBeenCalled()
  })

  it('readComposition throwing: refunds full credits, marks failed, returns ok:false', async () => {
    const deps = makeDeps({
      readComposition: vi.fn(async () => {
        throw new Error('composition file not found')
      }),
    })

    const result = await renderHyperframe(
      {
        releaseId: 'rel_5',
        templateId: 'missing',
        formats: ['square', 'portrait'],
        cookInput: { headline: 'Shipped' },
        brand,
        manifest,
        duration: 10,
        creditsPerFormat: 5,
      },
      deps,
    )

    expect(result).toEqual({ ok: false, reason: 'composition file not found' })
    expect(deps.refundCredits).toHaveBeenCalledWith('rel_5', 10)
    expect(deps.markFailed).toHaveBeenCalledWith('rel_5', 'composition file not found')
    expect(deps.invokeLambda).not.toHaveBeenCalled()
  })
})
