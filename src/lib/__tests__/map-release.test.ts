import { describe, it, expect } from 'vitest'
import {
  stripMarkdown,
  mapReleaseToRequest,
  buildSourceMetadata,
  type GitHubReleasePayload,
  type RepoConfig,
} from '../github/map-release'

const makePayload = (overrides?: Partial<GitHubReleasePayload>): GitHubReleasePayload => ({
  action: 'published',
  release: {
    id: 123,
    tag_name: 'v1.0.0',
    name: 'Release 1.0',
    body: '## What\'s new\n\n- Feature A\n- Feature B',
    prerelease: false,
    draft: false,
    html_url: 'https://github.com/org/repo/releases/tag/v1.0.0',
  },
  repository: { full_name: 'org/repo', owner: { login: 'org' }, name: 'repo' },
  installation: { id: 456 },
  ...overrides,
})

// ---------------------------------------------------------------------------
// stripMarkdown
// ---------------------------------------------------------------------------

describe('stripMarkdown', () => {
  it('removes headers', () => {
    expect(stripMarkdown('## Title\nBody')).toBe('Title\nBody')
  })

  it('removes multiple levels of headers', () => {
    expect(stripMarkdown('# H1\n## H2\n### H3')).toBe('H1\nH2\nH3')
  })

  it('removes bold', () => {
    expect(stripMarkdown('**bold** text')).toBe('bold text')
  })

  it('removes italic', () => {
    expect(stripMarkdown('*italic* text')).toBe('italic text')
  })

  it('removes bold and italic together', () => {
    expect(stripMarkdown('**bold** and *italic*')).toBe('bold and italic')
  })

  it('removes images but keeps surrounding text', () => {
    const input = '![alt](img.png) and [link](url)'
    const result = stripMarkdown(input)
    expect(result).not.toContain('![')
    expect(result).not.toContain('img.png')
    expect(result).toContain('link')
  })

  it('converts links to plain text', () => {
    expect(stripMarkdown('[click here](https://example.com)')).toBe('click here')
  })

  it('removes fenced code blocks', () => {
    const input = 'Before\n```\ncode here\n```\nAfter'
    const result = stripMarkdown(input)
    expect(result).not.toContain('```')
    expect(result).not.toContain('code here')
    expect(result).toContain('Before')
    expect(result).toContain('After')
  })

  it('removes inline code backticks but keeps content', () => {
    expect(stripMarkdown('Use `npm install`')).toBe('Use npm install')
  })

  it('removes unordered list markers', () => {
    const result = stripMarkdown('- item one\n* item two\n+ item three')
    expect(result).not.toMatch(/^[-*+]\s/m)
    expect(result).toContain('item one')
    expect(result).toContain('item two')
    expect(result).toContain('item three')
  })

  it('removes ordered list markers', () => {
    const result = stripMarkdown('1. First\n2. Second')
    expect(result).not.toMatch(/^\d+\./m)
    expect(result).toContain('First')
    expect(result).toContain('Second')
  })

  it('collapses excessive newlines to at most two', () => {
    const input = 'A\n\n\n\nB'
    expect(stripMarkdown(input)).toBe('A\n\nB')
  })

  it('trims leading and trailing whitespace', () => {
    expect(stripMarkdown('  \n\nHello\n\n  ')).toBe('Hello')
  })
})

// ---------------------------------------------------------------------------
// mapReleaseToRequest
// ---------------------------------------------------------------------------

describe('mapReleaseToRequest', () => {
  it('uses release name as title', () => {
    const payload = makePayload()
    const result = mapReleaseToRequest(payload, {})
    const titleObj = result.formats[0].slides[0].objects.find((o) => o.id === 'title')
    expect(titleObj?.text).toBe('Release 1.0')
  })

  it('falls back to tag_name when name is null', () => {
    const payload = makePayload({ release: { ...makePayload().release, name: null } })
    const result = mapReleaseToRequest(payload, {})
    const titleObj = result.formats[0].slides[0].objects.find((o) => o.id === 'title')
    expect(titleObj?.text).toBe('v1.0.0')
  })

  it('strips markdown from body for description', () => {
    const result = mapReleaseToRequest(makePayload(), {})
    const descObj = result.formats[0].slides[0].objects.find((o) => o.id === 'description')
    expect(descObj?.text).not.toContain('##')
    expect(descObj?.text).not.toContain('- ')
  })

  it('truncates description to 200 chars ending with ...', () => {
    const longBody = 'A'.repeat(300)
    const payload = makePayload({ release: { ...makePayload().release, body: longBody } })
    const result = mapReleaseToRequest(payload, {})
    const descObj = result.formats[0].slides[0].objects.find((o) => o.id === 'description')
    expect(descObj?.text?.length).toBe(200)
    expect(descObj?.text).toMatch(/\.\.\.$/)
  })

  it('does not add description object when body is null', () => {
    const payload = makePayload({ release: { ...makePayload().release, body: null } })
    const result = mapReleaseToRequest(payload, {})
    const descObj = result.formats[0].slides[0].objects.find((o) => o.id === 'description')
    expect(descObj).toBeUndefined()
  })

  it('applies brand_id from config', () => {
    const result = mapReleaseToRequest(makePayload(), { brandId: 'brand_abc' })
    expect(result.brand_id).toBe('brand_abc')
    expect(result.colors).toBeUndefined()
  })

  it('falls back to default colors when no brand_id', () => {
    const result = mapReleaseToRequest(makePayload(), {})
    expect(result.colors).toEqual({
      background: '#0f172a',
      text: '#f8fafc',
      primary: '#3b82f6',
    })
    expect(result.brand_id).toBeUndefined()
  })

  it('sets name to repo owner login when no brand_id', () => {
    const result = mapReleaseToRequest(makePayload(), {})
    expect(result.name).toBe('org')
  })

  it('respects config template', () => {
    const result = mapReleaseToRequest(makePayload(), { template: 'custom-template' })
    expect(result.template).toBe('custom-template')
  })

  it('defaults to standard-browser template', () => {
    const result = mapReleaseToRequest(makePayload(), {})
    expect(result.template).toBe('standard-browser')
  })

  it('respects config formats', () => {
    const result = mapReleaseToRequest(makePayload(), { formats: ['portrait', 'square'] })
    expect(result.formats.map((f) => f.name)).toEqual(['portrait', 'square'])
  })

  it('defaults to landscape format', () => {
    const result = mapReleaseToRequest(makePayload(), {})
    expect(result.formats.map((f) => f.name)).toEqual(['landscape'])
  })
})

// ---------------------------------------------------------------------------
// buildSourceMetadata
// ---------------------------------------------------------------------------

describe('buildSourceMetadata', () => {
  it('produces valid JSON', () => {
    const result = buildSourceMetadata(makePayload())
    expect(() => JSON.parse(result)).not.toThrow()
  })

  it('includes all required fields', () => {
    const parsed = JSON.parse(buildSourceMetadata(makePayload()))
    expect(parsed).toMatchObject({
      installationId: 456,
      repoFullName: 'org/repo',
      releaseTag: 'v1.0.0',
      githubReleaseId: 123,
    })
  })

  it('is deterministic for idempotency', () => {
    const payload = makePayload()
    expect(buildSourceMetadata(payload)).toBe(buildSourceMetadata(payload))
  })

  it('includes releaseUrl', () => {
    const parsed = JSON.parse(buildSourceMetadata(makePayload()))
    expect(parsed.releaseUrl).toBe('https://github.com/org/repo/releases/tag/v1.0.0')
  })

  it('handles missing installation id', () => {
    const payload = makePayload({ installation: undefined })
    const parsed = JSON.parse(buildSourceMetadata(payload))
    expect(parsed.installationId).toBeUndefined()
  })
})
