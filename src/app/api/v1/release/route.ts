import { renderRelease } from '@/lib/pipeline/render'
import { ReleaseRequest } from '@/lib/types'

export async function POST(request: Request) {
  let body: ReleaseRequest
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.slides || !Array.isArray(body.slides) || body.slides.length === 0) {
    return Response.json({ error: 'At least 1 slide is required' }, { status: 400 })
  }
  if (body.slides.length > 5) {
    return Response.json({ error: 'Maximum 5 slides allowed' }, { status: 400 })
  }
  for (const slide of body.slides) {
    if (!slide.title) {
      return Response.json({ error: 'Each slide must have a title' }, { status: 400 })
    }
  }
  if (body.template && !['classic', 'split', 'hero'].includes(body.template)) {
    return Response.json({ error: 'Invalid template. Use: classic, split, hero' }, { status: 400 })
  }
  if (body.formats) {
    const valid = ['landscape', 'square', 'portrait']
    for (const f of body.formats) {
      if (!valid.includes(f)) {
        return Response.json({ error: `Invalid format: ${f}` }, { status: 400 })
      }
    }
  }

  try {
    const result = await renderRelease(body)
    return Response.json(result, { status: 201 })
  } catch (err) {
    console.error('Render failed:', err)
    return Response.json({ error: 'Something burned. Try again.' }, { status: 500 })
  }
}
