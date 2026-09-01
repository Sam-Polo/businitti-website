import express from 'express'
import multer from 'multer'
import { requireAuth } from '../auth.js'
import { uploadToS3 } from '../s3.js'
import { convertHeicToJpeg, detectImageFormat } from '../image-convert.js'
import { logger } from '../logger.js'

const router = express.Router()

// все роуты требуют авторизации
router.use(requireAuth)

const MAX_FILE_SIZE = 10 * 1024 * 1024

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
  'image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'
]
// .heic/.heif пропускаем и по расширению: Windows не знает для них mimetype
// и присылает пустую строку или application/octet-stream
const ALLOWED_EXTENSIONS = /\.(jpe?g|png|webp|heic|heif)$/i
const UNSUPPORTED_MESSAGE = 'Разрешены только изображения: JPG, PNG, WebP, HEIC'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    // это только предварительный фильтр по заголовкам; настоящий формат
    // определяется по сигнатуре уже загруженного буфера — см. detectImageFormat
    if (ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase()) || ALLOWED_EXTENSIONS.test(file.originalname)) {
      cb(null, true)
    } else {
      cb(new Error(UNSUPPORTED_MESSAGE))
    }
  }
})

// загрузка фото в S3 + обработка ошибок multer
router.post(
  '/',
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.info('POST /api/upload — запрос получен, ожидаем тело с файлом')
    next()
  },
  upload.single('file'),
  async (req: express.Request, res: express.Response) => {
    try {
      if (!req.file) {
        logger.warn('запрос без файла или поле не "file"')
        return res.status(400).json({ error: 'файл не загружен' })
      }

      const sizeMB = (req.file.size / (1024 * 1024)).toFixed(2)
      logger.info({ name: req.file.originalname, sizeBytes: req.file.size, sizeMB }, 'файл принят')

      const format = detectImageFormat(req.file.buffer)
      if (!format) {
        logger.warn({ name: req.file.originalname, mimetype: req.file.mimetype }, 'файл не похож на поддерживаемое изображение')
        return res.status(400).json({ error: UNSUPPORTED_MESSAGE })
      }

      // HEIC браузеры (кроме Safari) не показывают — конвертируем в JPEG до заливки;
      // остальным форматам чиним mimetype по сигнатуре, чтобы S3 отдавал верный Content-Type
      const file = format === 'heif'
        ? await convertHeicToJpeg(req.file.buffer, req.file.originalname)
        : { buffer: req.file.buffer, fileName: req.file.originalname, mimeType: `image/${format}` }

      const fileUrl = await uploadToS3(file.buffer, file.fileName, file.mimeType)
      res.json({ url: fileUrl })
    } catch (error: any) {
      const errMsg = error?.message
      const errResponse = error?.response
      logger.error({
        error: errMsg,
        code: error?.code,
        status: errResponse?.status,
        data: errResponse?.data,
        stack: error?.stack
      }, 'ошибка загрузки фото')
      res.status(500).json({ error: errMsg || 'failed_to_upload' })
    }
  },
  (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        logger.warn({ limit: MAX_FILE_SIZE }, 'загрузка фото: превышен размер файла')
        return res.status(400).json({ error: 'file_too_large' })
      }
      logger.error({ code: err.code, message: err.message }, 'ошибка multer при загрузке')
      return res.status(400).json({ error: err.message || 'upload_failed' })
    }
    if (err) {
      logger.error({ error: err?.message, name: err?.name }, 'ошибка при загрузке фото (fileFilter или multer)')
      return res.status(400).json({ error: err?.message || 'upload_failed' })
    }
  }
)

export default router

