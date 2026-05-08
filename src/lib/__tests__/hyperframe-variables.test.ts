import { describe, it, expect } from 'vitest'
import { resolveVariables } from '../templates/hyperframe-variables'
import type { VariableManifest } from '../templates/hyperframe-manifest'

const brand = {
  background: '#fff8f0',
  text: '#4a3326',
  primary: '#d97706',
  logoUrl: 'https://example.com/logo.png',
}

describe('resolveVariables', () => {
  it('resolves a single string variable from cook input', () => {
    const manifest: VariableManifest = [
      { id: 'headline', type: 'string', label: 'Headline' },
    ]

    const variables = resolveVariables(manifest, { headline: 'Shipped' }, brand)

    expect(variables).toEqual({ headline: 'Shipped' })
  })

  it('populates reserved brand color ids from the brand record', () => {
    const manifest: VariableManifest = [
      { id: '__bg', type: 'string', label: 'Background' },
      { id: '__text', type: 'string', label: 'Text' },
      { id: '__primary', type: 'string', label: 'Primary' },
    ]

    const variables = resolveVariables(manifest, {}, brand)

    expect(variables).toEqual({
      __bg: '#fff8f0',
      __text: '#4a3326',
      __primary: '#d97706',
    })
  })

  it('populates reserved __logo id from the brand logo URL', () => {
    const manifest: VariableManifest = [
      { id: '__logo', type: 'image_url', label: 'Logo' },
    ]

    const variables = resolveVariables(manifest, {}, brand)

    expect(variables).toEqual({ __logo: 'https://example.com/logo.png' })
  })

  it('throws when a required variable is missing from cook input', () => {
    const manifest: VariableManifest = [
      { id: 'hero', type: 'image_url', label: 'Hero', required: true },
    ]

    expect(() => resolveVariables(manifest, {}, brand)).toThrow(/required.*hero/i)
  })

  it('omits optional variables that are not provided (no undefined keys)', () => {
    const manifest: VariableManifest = [
      { id: 'headline', type: 'string', label: 'Headline' },
      { id: 'subhead', type: 'string', label: 'Subhead' },
    ]

    const variables = resolveVariables(manifest, { headline: 'A' }, brand)

    expect(variables).toEqual({ headline: 'A' })
    expect('subhead' in variables).toBe(false)
  })

  it('throws when a string_array value has fewer items than min', () => {
    const manifest: VariableManifest = [
      { id: 'ships', type: 'string_array', label: 'Ships', min: 1, max: 5 },
    ]

    expect(() => resolveVariables(manifest, { ships: [] }, brand)).toThrow(/ships.*min.*1/i)
  })

  it('throws when a string_array value has more items than max', () => {
    const manifest: VariableManifest = [
      { id: 'ships', type: 'string_array', label: 'Ships', min: 1, max: 3 },
    ]

    expect(() => resolveVariables(manifest, { ships: ['a', 'b', 'c', 'd'] }, brand))
      .toThrow(/ships.*max.*3/i)
  })

  it('ignores cook input keys that are not in the manifest (stale draft fields)', () => {
    const manifest: VariableManifest = [
      { id: 'headline', type: 'string', label: 'Headline' },
    ]

    const variables = resolveVariables(
      manifest,
      { headline: 'A', leftover_from_other_template: 'B' },
      brand,
    )

    expect(variables).toEqual({ headline: 'A' })
  })
})
