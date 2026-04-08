import sharp from "sharp"
import { isR2Url, keyFromUrl, getImageBuffer } from "./storage/r2"

async function normalizeImage(input: Buffer): Promise<{ base64: string; contentType: string }> {
  const base64 = (await sharp(input).png().toBuffer()).toString("base64")
  return { base64, contentType: "image/png" }
}

export async function fetchImageAsBase64(url: string): Promise<string> {
  // For R2 URLs, try S3 direct read first to bypass Cloudflare CDN
  if (isR2Url(url)) {
    const key = keyFromUrl(url)
    if (key) {
      try {
        const { buffer } = await getImageBuffer(key)
        const { base64, contentType } = await normalizeImage(buffer)
        return `data:${contentType};base64,${base64}`
      } catch (err) {
        console.warn(`R2 direct read failed for key "${key}", falling back to CDN fetch:`, err)
      }
    }
  }

  const response = await fetch(url, {
    headers: {
      "User-Agent": "BragFast/1.0",
      "Accept": "image/png, image/jpeg, image/svg+xml",
    },
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${url} (${response.status})`)
  }
  const contentType = response.headers.get('content-type') || 'image/png'
  if (!contentType.startsWith('image/')) {
    throw new Error(`Expected image content-type but got ${contentType} for ${url}`)
  }
  const raw = Buffer.from(await response.arrayBuffer())
  const header = raw.subarray(0, 4).toString("hex")
  console.log(`[fetchImage] url=${url} content-type=${contentType} size=${raw.byteLength} header=${header}`)
  const { base64, contentType: normalizedType } = await normalizeImage(raw)
  return `data:${normalizedType};base64,${base64}`
}
