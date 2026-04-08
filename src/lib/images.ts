import { isR2Url, keyFromUrl, getImageBuffer } from "./storage/r2"

export async function fetchImageAsBase64(url: string): Promise<string> {
  // For R2 URLs, try S3 direct read first to bypass Cloudflare bot protection
  if (isR2Url(url)) {
    const key = keyFromUrl(url)
    if (key) {
      try {
        const { buffer, contentType } = await getImageBuffer(key)
        return `data:${contentType};base64,${buffer.toString('base64')}`
      } catch (err) {
        console.warn(`R2 direct read failed for key "${key}", falling back to CDN fetch:`, err)
      }
    }
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent": "BragFast/1.0",
      "Accept": "image/*",
    },
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${url} (${response.status})`)
  }
  const contentType = response.headers.get('content-type') || 'image/png'
  if (!contentType.startsWith('image/')) {
    throw new Error(`Expected image content-type but got ${contentType} for ${url}`)
  }
  const buffer = await response.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  return `data:${contentType};base64,${base64}`
}
