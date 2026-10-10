import convert from 'heic-convert'
import sharp from 'sharp'
import { logger } from './logger.js'

// без кеша libvips: картинки обрабатываются по разу, а кеш держал бы память
sharp.cache(false)

// качество JPEG при конверсии HEIC: визуально неотличимо от оригинала,
// но файл заметно легче, чем на дефолтных 0.92
const JPEG_QUALITY = 0.85

// ужимаем только запредельно тяжёлые файлы (лимит загрузки — 10 МБ); всё, что легче,
// уходит в S3 как есть, байт в байт
const OPTIMIZE_THRESHOLD_BYTES = 5 * 1024 * 1024

// длинная сторона после ужатия: с запасом больше любого экрана с увеличением,
// так что детали украшения не теряются; меньшие фото не масштабируются вовсе
const MAX_DIMENSION = 4096

// q95 без цветовой субдискретизации (4:4:4) визуально неотличим от оригинала: по замерам
// на реальных фото сайта (q100, 4 Мп) PSNR ~43 дБ при файле в 3 раза легче
const OPTIMIZED_JPEG_QUALITY = 95

// если пережатие экономит меньше 20% — оставляем оригинал, рисковать качеством незачем
const MIN_SAVING_RATIO = 0.8

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

export type ProcessedImage = { buffer: Buffer; fileName: string; mimeType: string }

// HEIC/HEIF → JPEG: браузеры (кроме Safari) HEIC не рисуют, поэтому в S3 кладём уже JPEG
export async function convertHeicToJpeg(
  buffer: Buffer,
  fileName: string
): Promise<ProcessedImage> {
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

// ужатие запредельно тяжёлых фото (JPEG/PNG/WebP, в т.ч. JPEG после HEIC):
// длинная сторона ограничивается MAX_DIMENSION, перекодирование в JPEG q95 4:4:4.
// Фото с реальной прозрачностью остаются PNG (без потерь). Любая ошибка — заливаем оригинал:
// ужатие — оптимизация, а не условие загрузки
export async function optimizeOversizedImage(image: ProcessedImage): Promise<ProcessedImage> {
  if (image.buffer.length <= OPTIMIZE_THRESHOLD_BYTES) return image

  await acquireSlot()
  const startedAt = Date.now()
  try {
    const input = sharp(image.buffer, { failOn: 'none' })
    const meta = await input.metadata()

    // rotate() без аргументов разворачивает по EXIF: метаданные при перекодировании
    // отбрасываются, и без этого фото с телефона легло бы на бок.
    // ICC-профиль сохраняем — иначе у фото в Display P3 поплывут цвета
    let pipeline = input
      .rotate()
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
      .keepIccProfile()

    // альфа-канал бывает и у полностью непрозрачных PNG (экспорт из редакторов) —
    // такие спокойно уходят в JPEG, PNG оставляем только при реальной прозрачности
    const keepAlpha = meta.hasAlpha === true && !(await input.stats()).isOpaque
    pipeline = keepAlpha
      ? pipeline.png({ compressionLevel: 9 })
      : pipeline.jpeg({ quality: OPTIMIZED_JPEG_QUALITY, chromaSubsampling: '4:4:4', mozjpeg: true })

    const output = await pipeline.toBuffer({ resolveWithObject: true })

    const logInfo = {
      fileName: image.fileName,
      from: { bytes: image.buffer.length, width: meta.width, height: meta.height },
      to: { bytes: output.data.length, width: output.info.width, height: output.info.height },
      ms: Date.now() - startedAt
    }

    if (output.data.length > image.buffer.length * MIN_SAVING_RATIO) {
      logger.info(logInfo, 'ужатие фото почти ничего не даёт — заливаем оригинал')
      return image
    }

    const ext = keepAlpha ? '.png' : '.jpg'
    const fileName = (image.fileName.replace(/\.[^.]*$/, '') || 'photo') + ext
    logger.info(logInfo, 'тяжёлое фото ужато')
    return { buffer: output.data, fileName, mimeType: keepAlpha ? 'image/png' : 'image/jpeg' }
  } catch (error: any) {
    logger.warn({ fileName: image.fileName, error: error?.message }, 'не удалось ужать фото — заливаем оригинал')
    return image
  } finally {
    releaseSlot()
  }
}
