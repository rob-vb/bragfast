import { readFile } from 'fs/promises'
import path from 'path'
import { NextRequest } from 'next/server'

const OUTPUT_DIR = path.join(process.cwd(), '.output')

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params
  const filePath = path.join(OUTPUT_DIR, ...segments)

  // Prevent directory traversal
  if (!filePath.startsWith(OUTPUT_DIR)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const buffer = await readFile(filePath)
    return new Response(buffer, {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000' },
    })
  } catch {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
}
