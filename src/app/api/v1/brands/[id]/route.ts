import { getBrand, updateBrand, deleteBrand } from '@/lib/brands'
import type { UpdateBrandInput } from '@/lib/brands'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const brand = await getBrand(id)
  if (!brand) return Response.json({ error: 'Brand not found' }, { status: 404 })
  return Response.json(brand)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const input: UpdateBrandInput = {}
  if (typeof body.name === 'string') input.name = body.name
  if (typeof body.logo_url === 'string') input.logo_url = body.logo_url
  if (typeof body.website === 'string') input.website = body.website
  if (body.colors && typeof body.colors === 'object' && !Array.isArray(body.colors)) {
    const c = body.colors as Record<string, unknown>
    input.colors = {}
    if (typeof c.background === 'string') input.colors.background = c.background
    if (typeof c.text === 'string') input.colors.text = c.text
    if (typeof c.primary === 'string') input.colors.primary = c.primary
  }

  const updated = await updateBrand(id, input)
  if (!updated) return Response.json({ error: 'Brand not found' }, { status: 404 })
  return Response.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const deleted = await deleteBrand(id)
  if (!deleted) return Response.json({ error: 'Brand not found' }, { status: 404 })
  return new Response(null, { status: 204 })
}
