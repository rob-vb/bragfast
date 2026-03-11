import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3'

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.R2_BUCKET_NAME!
const PUBLIC_URL = process.env.R2_PUBLIC_URL!

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
