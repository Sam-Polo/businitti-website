import convert from 'heic-convert'
import { logger } from './logger.js'

// качество JPEG при конверсии HEIC: визуально неотличимо от оригинала,
// но файл заметно легче, чем на дефолтных 0.92
const JPEG_QUALITY = 0.85

// декодирование HEIC идёт в WASM и держит в памяти распакованный RGBA
// (12 Мп ≈ 50 МБ), поэтому число параллельных конверсий ограничено —
// иначе пачка фото, загруженная из админки разом, кладёт бэкенд по памяти
const MAX_PARALLEL_CONVERSIONS = 2

export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'heif'

// ftyp-бренды контейнера HEIF/HEIC (ISO/IEC 23008-12)
const HEIF_BRANDS = new Set([
  'heic', 'heix', 'heim', 'heis',
  'hevc', 'hevx', 'hevm', 'hevs',
  'mif1', 'msf1'
])

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

// формат определяем по сигнатуре файла, а не по mimetype: браузер для .heic
// присылает что попало (Windows — пустую строку или application/octet-stream)
export function detectImageFormat(buffer: Buffer): ImageFormat | null {
  if (buffer.length < 16) return null

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg'

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return 'png'

  // WebP: RIFF....WEBP
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp'

  // HEIF/HEIC: ISO-BMFF, бренд в ftyp-боксе
  if (buffer.toString('ascii', 4, 8) === 'ftyp' && HEIF_BRANDS.has(buffer.toString('ascii', 8, 12))) return 'heif'

  return null
}

let running = 0
const waiting: Array<() => void> = []

async function acquireSlot(): Promise<void> {
  // while, а не if: разбуженная задача могла проиграть гонку за слот и встаёт в очередь заново
  while (running >= MAX_PARALLEL_CONVERSIONS) {
    await new Promise<void>(resolve => waiting.push(resolve))
  }
  running++
}

function releaseSlot(): void {
  running--
  waiting.shift()?.()
}

// HEIC/HEIF → JPEG: браузеры (кроме Safari) HEIC не рисуют, поэтому в S3 кладём уже JPEG
export async function convertHeicToJpeg(
  buffer: Buffer,
  fileName: string
): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
  if (running >= MAX_PARALLEL_CONVERSIONS) {
    logger.info({ fileName, running, waiting: waiting.length }, 'конверсия HEIC поставлена в очередь')
  }
  await acquireSlot()

  const startedAt = Date.now()
  try {
    const output = await convert({ buffer, format: 'JPEG', quality: JPEG_QUALITY })
    const jpeg = Buffer.from(output)
    const jpegName = (fileName.replace(/\.[^.]*$/, '') || 'photo') + '.jpg'

    logger.info(
      { fileName, jpegName, fromBytes: buffer.length, toBytes: jpeg.length, ms: Date.now() - startedAt },
      'HEIC сконвертирован в JPEG'
    )
    return { buffer: jpeg, fileName: jpegName, mimeType: 'image/jpeg' }
  } catch (error: any) {
    logger.error({ fileName, error: error?.message, ms: Date.now() - startedAt }, 'не удалось сконвертировать HEIC')
    throw new Error('Не удалось обработать HEIC-файл — попробуйте сохранить фото в JPG')
  } finally {
    releaseSlot()
  }
}
