import { createBrand } from '@/lib/brands'

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.name || typeof body.name !== 'string') {
    return Response.json({ error: 'name is required' }, { status: 400 })
  }

  if (!body.colors || typeof body.colors !== 'object' || Array.isArray(body.colors)) {
    return Response.json({ error: 'colors is required' }, { status: 400 })
  }
  const colors = body.colors as Record<string, unknown>
  if (
    typeof colors.background !== 'string' ||
    typeof colors.text !== 'string' ||
    typeof colors.primary !== 'string'
  ) {
    return Response.json(
      { error: 'colors must include background, text, and primary (hex strings)' },
      { status: 400 }
    )
  }

  try {
    const brand = await createBrand({
      name: body.name,
      logo_url: typeof body.logo_url === 'string' ? body.logo_url : undefined,
      website: typeof body.website === 'string' ? body.website : undefined,
      colors: {
        background: colors.background,
        text: colors.text,
        primary: colors.primary,
      },
    })
    return Response.json(brand, { status: 201 })
  } catch (err) {
    console.error('Failed to create brand:', err)
    return Response.json({ error: 'Failed to create brand' }, { status: 500 })
  }
}
