import { getRelease } from '@/lib/pipeline/render'
import { NextRequest } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const result = await getRelease(id)
  if (!result) {
    return Response.json({ error: 'Release not found' }, { status: 404 })
  }
  return Response.json(result)
}
