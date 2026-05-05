import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { logger } from './logger.js'

function getS3Client(): S3Client {
  const endpoint = process.env.S3_ENDPOINT
  const region = process.env.S3_REGION || 'ru-central-1'
  const accessKey = process.env.S3_ACCESS_KEY
  const secretKey = process.env.S3_SECRET_KEY

  if (!endpoint || !accessKey || !secretKey) {
    throw new Error('S3_ENDPOINT, S3_ACCESS_KEY и S3_SECRET_KEY должны быть заданы в .env')
  }

  return new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
    forcePathStyle: true,
  })
}

function buildPublicUrl(key: string): string {
  const base = process.env.S3_PUBLIC_URL
  const bucket = process.env.S3_BUCKET
  const endpoint = process.env.S3_ENDPOINT!

  if (base) return `${base.replace(/\/$/, '')}/${key}`
  // fallback: endpoint + /bucket/key
  return `${endpoint.replace(/\/$/, '')}/${bucket}/${key}`
}

export async function uploadToS3(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string> {
  const bucket = process.env.S3_BUCKET
  if (!bucket) throw new Error('S3_BUCKET должен быть задан в .env')

  const ext = fileName.includes('.') ? fileName.split('.').pop() : ''
  const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}${ext ? '.' + ext : ''}`

  const client = getS3Client()

  logger.info({ fileName, key, bucket }, 'загрузка файла в S3')

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
    ACL: 'public-read',
  }))

  const url = buildPublicUrl(key)
  logger.info({ fileName, url }, 'файл загружен в S3')
  return url
}

export async function deleteFromS3(url: string): Promise<void> {
  const bucket = process.env.S3_BUCKET
  const endpoint = process.env.S3_ENDPOINT!
  if (!bucket) return

  // извлекаем key из URL
  const base = process.env.S3_PUBLIC_URL
    ? process.env.S3_PUBLIC_URL.replace(/\/$/, '')
    : `${endpoint.replace(/\/$/, '')}/${bucket}`

  if (!url.startsWith(base)) return
  const key = url.slice(base.length + 1)

  const client = getS3Client()
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
  logger.info({ url, key }, 'файл удалён из S3')
}
