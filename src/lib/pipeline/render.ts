import satori from 'satori'
import sharp from 'sharp'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { templates } from '../templates/registry'
import { loadFonts } from '../fonts'
import { fetchImageAsBase64 } from '../images'
import { ReleaseRequest, Slide, FORMAT_DIMENSIONS } from '../types'
import { getPlaceholderBrand } from '../brand'

const OUTPUT_DIR = path.join(process.cwd(), '.output')

export async function renderRelease(request: ReleaseRequest) {
  const releaseId = `rel_${crypto.randomUUID().slice(0, 10)}`
  const releaseDir = path.join(OUTPUT_DIR, releaseId)
  await mkdir(releaseDir, { recursive: true })

  const brand = getPlaceholderBrand()
  const templateName = request.template || 'classic'
  const template = templates[templateName]
  const formats = request.formats || ['landscape', 'square', 'portrait']
  const fonts = loadFonts()

  // Pre-fetch all slide images in parallel
  const slides: Slide[] = await Promise.all(
    request.slides.map(async (s) => ({
      title: s.title,
      description: s.description,
      imageBase64: s.image_url ? await fetchImageAsBase64(s.image_url) : undefined,
      device: s.device || 'browser',
    }))
  )

  const images: Record<string, { slides: string[]; dimensions: string }> = {}

  for (const format of formats) {
    const { width, height } = FORMAT_DIMENSIONS[format]
    const slideUrls: string[] = []

    for (let i = 0; i < slides.length; i++) {
      const jsx = template({ slide: slides[i], brand, width, height })
      const svg = await satori(jsx, { width, height, fonts })
      const png = await sharp(Buffer.from(svg)).png().toBuffer()
      const filename = `${format}-${i + 1}.png`
      await writeFile(path.join(releaseDir, filename), png)
      slideUrls.push(`/api/v1/assets/${releaseId}/${filename}`)
    }

    images[format] = { slides: slideUrls, dimensions: `${width}x${height}` }
  }

  return {
    release_id: releaseId,
    images,
    credits_used: slides.length * formats.length,
    credits_remaining: 999,
    created_at: new Date().toISOString(),
  }
}
