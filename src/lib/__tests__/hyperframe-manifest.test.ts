import { describe, it, expect } from 'vitest'
import { parseManifest } from '../templates/hyperframe-manifest'

describe('parseManifest', () => {
  it('parses a well-formed string variable', () => {
    const html = `<!doctype html><html data-composition-variables='[
      {"id":"headline","type":"string","label":"Headline","default":"Shipped"}
    ]'><body></body></html>`

    const manifest = parseManifest(html)

    expect(manifest).toEqual([
      { id: 'headline', type: 'string', label: 'Headline', default: 'Shipped' },
    ])
  })

  it('parses image_url, video_url, and string_array types alongside string', () => {
    const html = `<!doctype html><html data-composition-variables='[
      {"id":"headline","type":"string","label":"Headline"},
      {"id":"hero","type":"image_url","label":"Hero image","required":true},
      {"id":"clip","type":"video_url","label":"Hero clip"},
      {"id":"ships","type":"string_array","label":"Shipped this week"}
    ]'><body></body></html>`

    const manifest = parseManifest(html)

    expect(manifest).toEqual([
      { id: 'headline', type: 'string', label: 'Headline' },
      { id: 'hero', type: 'image_url', label: 'Hero image', required: true },
      { id: 'clip', type: 'video_url', label: 'Hero clip' },
      { id: 'ships', type: 'string_array', label: 'Shipped this week' },
    ])
  })

  it('preserves min and max constraints on string_array', () => {
    const html = `<!doctype html><html data-composition-variables='[
      {"id":"ships","type":"string_array","label":"Ships","min":1,"max":5}
    ]'></html>`

    const manifest = parseManifest(html)

    expect(manifest).toEqual([
      { id: 'ships', type: 'string_array', label: 'Ships', min: 1, max: 5 },
    ])
  })

  it('accepts reserved __-prefixed ids (brand colors, logo) without special-casing', () => {
    const html = `<!doctype html><html data-composition-variables='[
      {"id":"__bg","type":"string","label":"Background"},
      {"id":"__text","type":"string","label":"Text"},
      {"id":"__primary","type":"string","label":"Primary"},
      {"id":"__logo","type":"image_url","label":"Logo"}
    ]'></html>`

    const manifest = parseManifest(html)

    expect(manifest.map((d) => d.id)).toEqual(['__bg', '__text', '__primary', '__logo'])
  })

  it('throws a clear error when data-composition-variables is malformed JSON', () => {
    const html = `<!doctype html><html data-composition-variables='[not json'></html>`

    expect(() => parseManifest(html)).toThrow(/data-composition-variables/i)
  })

  it('throws when two declarations share the same id', () => {
    const html = `<!doctype html><html data-composition-variables='[
      {"id":"headline","type":"string","label":"A"},
      {"id":"headline","type":"string","label":"B"}
    ]'></html>`

    expect(() => parseManifest(html)).toThrow(/duplicate.*headline/i)
  })

  it('returns an empty manifest when data-composition-variables is missing', () => {
    const html = `<!doctype html><html><body></body></html>`

    expect(parseManifest(html)).toEqual([])
  })
})
