import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { logger } from './logger.js'

const app = express()
const PORT = process.env.PORT || 4001

// бэкенд за nginx: берём реальный IP клиента из X-Forwarded-For (нужно для rate limiting)
app.set('trust proxy', 1)

// security headers; crossOriginResourcePolicy ослабляем, чтобы фронт мог тянуть статику через CORS
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // CSP отключаем — фронт ходит через CORS, лишние ограничения мешают
}))

// лог каждого входящего запроса (до разбора body) — чтобы видеть, доходят ли большие запросы до Node
app.use((req: express.Request, _res: express.Response, next: express.NextFunction) => {
  const len = req.headers['content-length']
  logger.info({ method: req.method, url: req.url, contentLength: len ?? '—' }, 'входящий запрос')
  next()
})

// CORS настройка
const adminFrontendUrl = process.env.ADMIN_FRONTEND_URL || 'http://localhost:5174'
const publicSiteUrls = (process.env.PUBLIC_SITE_URLS || 'https://businitti.ru,https://www.businitti.ru,http://localhost:5173')
  .split(',').map((s) => s.trim()).filter(Boolean)
const allowedOrigins = new Set<string>([adminFrontendUrl, ...publicSiteUrls])
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true) // same-origin / curl
    if (allowedOrigins.has(origin)) return cb(null, true)
    cb(new Error('Not allowed by CORS'))
  },
  credentials: true
}))

// ограничение размера JSON body для защиты от DoS
app.use(express.json({ limit: '1mb' }))
// для Робокассы (Result URL приходит как form-urlencoded)
app.use(express.urlencoded({ extended: true, limit: '1mb' }))

// health check
app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({ status: 'ok' })
})

// роуты
import authRoutes from './routes/auth.js'
import productRoutes from './routes/products.js'
import uploadRoutes from './routes/upload.js'
import promocodeRoutes from './routes/promocodes.js'
import settingsRoutes from './routes/settings.js'
import categoriesRoutes from './routes/categories.js'
import paymentRoutes from './routes/payment.js'
import publicRoutes from './routes/public.js'
import ordersRoutes from './routes/orders.js'
import contentRoutes from './routes/content.js'

app.use('/api/public', publicRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/orders', ordersRoutes)
app.use('/api/products', productRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/promocodes', promocodeRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/categories', categoriesRoutes)
app.use('/api/payment', paymentRoutes)
app.use('/api/content', contentRoutes)

app.listen(PORT, () => {
  logger.info(`Админ-панель бэкенд запущен на порту ${PORT}`)
})

