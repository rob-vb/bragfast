import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
})

const BUCKET = process.env.R2_BUCKET_NAME!
const PUBLIC_URL = process.env.R2_PUBLIC_URL!

export function publicUrlForKey(key: string): string {
  return `${PUBLIC_URL}/${key}`
}

export function isR2Url(url: string): boolean {
  return url.startsWith(PUBLIC_URL)
}

export function keyFromUrl(url: string): string | null {
  if (!isR2Url(url)) return null
  return url.slice(PUBLIC_URL.length + 1)
}

export async function deleteByKey(key: string): Promise<void> {
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}

export async function deleteByPrefix(prefix: string): Promise<number> {
  let deleted = 0
  let continuationToken: string | undefined

  do {
    const list = await client.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    }))

    const objects = list.Contents
    if (objects && objects.length > 0) {
      await client.send(new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: {
          Objects: objects.map((o) => ({ Key: o.Key })),
          Quiet: true,
        },
      }))
      deleted += objects.length
    }

    continuationToken = list.IsTruncated ? list.NextContinuationToken : undefined
  } while (continuationToken)

  return deleted
}

export async function getImageBuffer(key: string): Promise<{ buffer: Buffer; contentType: string }> {
  const res = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
  const bytes = await res.Body!.transformToByteArray()
  return {
    buffer: Buffer.from(bytes),
    contentType: res.ContentType || 'image/png',
  }
}

export async function createPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 300,
): Promise<{ uploadUrl: string; publicUrl: string }> {
  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
    { expiresIn },
  )
  return { uploadUrl, publicUrl: publicUrlForKey(key) }
}

export async function headObject(key: string): Promise<{ size: number; contentType: string } | null> {
  try {
    const res = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
    const size = Number(res.ContentLength ?? 0)
    return { size, contentType: res.ContentType || 'application/octet-stream' }
  } catch {
    return null
  }
}

export async function uploadImage(buffer: Buffer, key: string, contentType = 'image/jpeg'): Promise<string> {
  await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }))
  return `${PUBLIC_URL}/${key}`
}

export async function putChunk(key: string, body: Buffer, contentType: string): Promise<{ size: number }> {
  await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  }))
  return { size: body.length }
}

export async function getChunkBuffer(key: string): Promise<Buffer> {
  const res = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }))
  const bytes = await res.Body!.transformToByteArray()
  return Buffer.from(bytes)
}

export async function assembleChunks(opts: {
  chunkKeys: string[]
  destKey: string
  contentType: string
}): Promise<string> {
  const buffers = await Promise.all(opts.chunkKeys.map(getChunkBuffer))
  const merged = Buffer.concat(buffers)
  return uploadImage(merged, opts.destKey, opts.contentType)
}
