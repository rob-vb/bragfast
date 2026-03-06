import satori from 'satori'
import sharp from 'sharp'
import { writeFile, mkdir, readFile } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { templates } from '../templates/registry'
import { loadFonts } from '../fonts'
import { fetchImageAsBase64 } from '../images'
import { ReleaseRequest, ReleaseResult, FORMAT_DIMENSIONS } from '../types'
import { getPlaceholderBrand } from '../brand'
import { getBrand } from '../brands'

const OUTPUT_DIR = path.join(process.cwd(), '.output')

export async function createRelease(request: ReleaseRequest): Promise<ReleaseResult> {
  const releaseId = `rel_${crypto.randomUUID().slice(0, 10)}`
  const releaseDir = path.join(OUTPUT_DIR, releaseId)
  await mkdir(releaseDir, { recursive: true })

  const formats = request.formats || ['landscape', 'square', 'portrait']
  const result: ReleaseResult = {
    release_id: releaseId,
    status: 'pending',
    images: null,
    credits_used: request.slides.length * formats.length,
    credits_remaining: 999,
    created_at: new Date().toISOString(),
    transparent: request.transparent ?? false,
    metadata: request.metadata,
    webhook_url: request.webhook_url,
  }

  await writeFile(path.join(releaseDir, 'release.json'), JSON.stringify(result, null, 2))
  return result
}

export async function getRelease(releaseId: string): Promise<ReleaseResult | null> {
  try {
    const filePath = path.join(OUTPUT_DIR, releaseId, 'release.json')
    const data = await readFile(filePath, 'utf-8')
    return JSON.parse(data) as ReleaseResult
  } catch {
    return null
  }
}

export async function renderReleaseAsync(releaseId: string, request: ReleaseRequest): Promise<void> {
  const releaseDir = path.join(OUTPUT_DIR, releaseId)

  try {
    let brand = getPlaceholderBrand()
    if (request.brand_id) {
      const brandRecord = await getBrand(request.brand_id)
      if (brandRecord) {
        brand = {
          name: brandRecord.name,
          logoBase64: brandRecord.logo_url ? await fetchImageAsBase64(brandRecord.logo_url) : '',
          website: brandRecord.website ?? '',
          colors: brandRecord.colors,
        }
      }
    }
    const templateName = request.template || 'classic'
    const template = templates[templateName]
    const formats = request.formats || ['landscape', 'square', 'portrait']
    const fonts = loadFonts()
    const transparent = request.transparent ?? false

    const slides = await Promise.all(
      request.slides.map(async (s) => ({
        title: s.title,
        description: s.description,
        imageBase64: s.image_url ? await fetchImageAsBase64(s.image_url) : undefined,
        device: s.device || ('browser' as const),
        align: s.align,
      }))
    )

    const images: Record<string, { slides: string[]; dimensions: string }> = {}

    for (const format of formats) {
      const { width, height } = FORMAT_DIMENSIONS[format]
      const slideUrls: string[] = []

      for (let i = 0; i < slides.length; i++) {
        const jsx = template({ slide: slides[i], brand, width, height, transparent })
        const svg = await satori(jsx, { width, height, fonts })
        const png = await sharp(Buffer.from(svg))
          .ensureAlpha()
          .png()
          .toBuffer()
        const filename = `${format}-${i + 1}.png`
        await writeFile(path.join(releaseDir, filename), png)
        slideUrls.push(`/api/v1/assets/${releaseId}/${filename}`)
      }

      images[format] = { slides: slideUrls, dimensions: `${width}x${height}` }
    }

    const completed: ReleaseResult = {
      release_id: releaseId,
      status: 'completed',
      images,
      credits_used: slides.length * formats.length,
      credits_remaining: 999,
      created_at: (await getRelease(releaseId))!.created_at,
      completed_at: new Date().toISOString(),
      transparent,
      metadata: request.metadata,
      webhook_url: request.webhook_url,
    }

    await writeFile(path.join(releaseDir, 'release.json'), JSON.stringify(completed, null, 2))

    if (request.webhook_url) {
      await callWebhook(request.webhook_url, completed)
    }
  } catch (err) {
    console.error(`Render failed for ${releaseId}:`, err)
    const failed: Partial<ReleaseResult> = {
      status: 'failed',
      completed_at: new Date().toISOString(),
    }
    const existing = await getRelease(releaseId)
    if (existing) {
      await writeFile(
        path.join(releaseDir, 'release.json'),
        JSON.stringify({ ...existing, ...failed }, null, 2)
      )
      if (request.webhook_url) {
        await callWebhook(request.webhook_url, { ...existing, ...failed } as ReleaseResult)
      }
    }
  }
}

async function callWebhook(url: string, payload: ReleaseResult): Promise<void> {
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    console.error(`Webhook delivery failed to ${url}:`, err)
  }
}
