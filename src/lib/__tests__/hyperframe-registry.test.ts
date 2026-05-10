import { describe, it, expect } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { makeReadComposition } from '../templates/hyperframe-registry'

function withTempRoot(fn: (root: string) => Promise<void> | void) {
  const root = mkdtempSync(join(tmpdir(), 'bf-hyperframes-'))
  return Promise.resolve(fn(root)).finally(() => rmSync(root, { recursive: true, force: true }))
}

describe('makeReadComposition', () => {
  it('reads <root>/<templateId>/<format>.html and returns { html }', async () => {
    await withTempRoot(async (root) => {
      mkdirSync(join(root, 'milestone'))
      writeFileSync(join(root, 'milestone', 'square.html'), '<html>SQUARE</html>')

      const readComposition = makeReadComposition(root)
      const result = await readComposition('milestone', 'square')

      expect(result).toEqual({ html: '<html>SQUARE</html>' })
    })
  })

  it('throws a clear error when templateId directory does not exist', async () => {
    await withTempRoot(async (root) => {
      const readComposition = makeReadComposition(root)
      await expect(readComposition('missing', 'square')).rejects.toThrow(/missing.*square/i)
    })
  })

  it('throws when template directory exists but format file is missing', async () => {
    await withTempRoot(async (root) => {
      mkdirSync(join(root, 'milestone'))
      writeFileSync(join(root, 'milestone', 'square.html'), '<html></html>')

      const readComposition = makeReadComposition(root)
      await expect(readComposition('milestone', 'landscape')).rejects.toThrow(/milestone.*landscape/i)
    })
  })
})
